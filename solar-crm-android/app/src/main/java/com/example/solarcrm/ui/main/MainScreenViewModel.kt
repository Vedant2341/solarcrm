package com.example.solarcrm.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.solarcrm.data.AuthState
import com.example.solarcrm.data.CallLog
import com.example.solarcrm.data.DataRepository
import com.example.solarcrm.data.Vendor
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainScreenViewModel(private val dataRepository: DataRepository) : ViewModel() {

    val authState: StateFlow<AuthState> = dataRepository.authState
    val isLoading: StateFlow<Boolean> = dataRepository.isLoading
    val error: StateFlow<String?> = dataRepository.error
    val callLogs: StateFlow<Map<Int, List<CallLog>>> = dataRepository.callLogs

    // Navigation and tab selection: "dashboard", "directory", "profile"
    private val _activeTab = MutableStateFlow("dashboard")
    val activeTab: StateFlow<String> = _activeTab.asStateFlow()

    // Filters and search
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedState = MutableStateFlow("All")
    val selectedState: StateFlow<String> = _selectedState.asStateFlow()

    private val _selectedDistrict = MutableStateFlow("All")
    val selectedDistrict: StateFlow<String> = _selectedDistrict.asStateFlow()

    private val _selectedSort = MutableStateFlow("Name")
    val selectedSort: StateFlow<String> = _selectedSort.asStateFlow()

    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun updateSelectedState(state: String) {
        _selectedState.value = state
        _selectedDistrict.value = "All" // Reset district when state changes
    }

    fun updateSelectedDistrict(district: String) {
        _selectedDistrict.value = district
    }

    fun updateSelectedSort(sort: String) {
        _selectedSort.value = sort
    }

    fun updateActiveTab(tab: String) {
        _activeTab.value = tab
    }

    // --- Calendar View State & Logic ---
    private val _calendarMonthDate = MutableStateFlow(Date())
    val calendarMonthDate: StateFlow<Date> = _calendarMonthDate.asStateFlow()

    private val _selectedCalendarDay = MutableStateFlow(getTodayString())
    val selectedCalendarDay: StateFlow<String> = _selectedCalendarDay.asStateFlow()

    val calendarFollowUpDates: StateFlow<Set<String>> = dataRepository.vendors.map { list ->
        list.mapNotNull { it.latestFollowUp }.toSet()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptySet())

    val selectedDayFollowUps: StateFlow<List<Vendor>> = combine(
        dataRepository.vendors,
        _selectedCalendarDay
    ) { list, selectedDay ->
        list.filter { it.latestFollowUp == selectedDay }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun nextMonth() {
        val cal = java.util.Calendar.getInstance()
        cal.time = _calendarMonthDate.value
        cal.add(java.util.Calendar.MONTH, 1)
        _calendarMonthDate.value = cal.time
    }

    fun prevMonth() {
        val cal = java.util.Calendar.getInstance()
        cal.time = _calendarMonthDate.value
        cal.add(java.util.Calendar.MONTH, -1)
        _calendarMonthDate.value = cal.time
    }

    fun selectCalendarDay(dayString: String) {
        _selectedCalendarDay.value = dayString
    }

    // Dynamic lists of states and districts
    val availableStates: StateFlow<List<String>> = dataRepository.vendors
        .map { list ->
            listOf("All") + list.map { it.state }.distinct().sorted()
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), listOf("All"))

    val availableDistricts: StateFlow<List<String>> = combine(
        dataRepository.vendors,
        _selectedState
    ) { list, stateFilter ->
        val districts = if (stateFilter == "All") {
            list.map { it.district }
        } else {
            list.filter { it.state == stateFilter }.map { it.district }
        }
        listOf("All") + districts.distinct().sorted()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), listOf("All"))

    // Reactive Filtered Vendors List
    val filteredVendors: StateFlow<List<Vendor>> = combine(
        dataRepository.vendors,
        _searchQuery,
        _selectedState,
        _selectedDistrict,
        _selectedSort
    ) { vendors, query, stateFilter, districtFilter, sortCriteria ->
        var filtered = vendors

        if (query.isNotBlank()) {
            val q = query.lowercase(Locale.ROOT).trim()
            filtered = filtered.filter { v ->
                v.vendorName.lowercase(Locale.ROOT).contains(q) ||
                v.address.lowercase(Locale.ROOT).contains(q) ||
                (v.contactPersonName?.lowercase(Locale.ROOT)?.contains(q) == true) ||
                (v.contactPersonMobile?.contains(q) == true) ||
                v.vendorBrandsList.any { it.lowercase(Locale.ROOT).contains(q) }
            }
        }

        if (stateFilter != "All") {
            filtered = filtered.filter { it.state == stateFilter }
        }

        if (districtFilter != "All") {
            filtered = filtered.filter { it.district == districtFilter }
        }

        when (sortCriteria) {
            "Name" -> filtered = filtered.sortedBy { it.vendorName }
            "Nation-wide Capacity" -> filtered = filtered.sortedByDescending { it.nationwiseCapacity }
            "State-wide Capacity" -> filtered = filtered.sortedByDescending { it.statewiseCapacity }
            "District-wide Capacity" -> filtered = filtered.sortedByDescending { it.districtwiseCapacity }
            "Nation-wide Installs" -> filtered = filtered.sortedByDescending { it.nationwiseInstalls }
            "State-wide Installs" -> filtered = filtered.sortedByDescending { it.statewiseInstalls }
            "District-wide Installs" -> filtered = filtered.sortedByDescending { it.districtwiseInstalls }
            "Installs" -> filtered = filtered.sortedByDescending { it.nationwiseInstalls }
        }

        filtered
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // --- Dashboard Stats Calculations ---

    data class DashboardStats(
        val totalLeads: Int,
        val contactedLeads: Int,
        val interestedLeads: Int,
        val todayFollowUps: Int
    )

    private fun getTodayString(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return sdf.format(Date())
    }

    val dashboardStats: StateFlow<DashboardStats> = dataRepository.vendors.map { list ->
        val todayStr = getTodayString()
        val total = list.size
        var contacted = 0
        var interested = 0
        var todayFollowUps = 0

        list.forEach { v ->
            if (v.status != "Pending") {
                contacted++
                if (v.status == "Interested") {
                    interested++
                }
            }
            if (v.latestFollowUp == todayStr) {
                todayFollowUps++
            }
        }

        DashboardStats(
            totalLeads = total,
            contactedLeads = contacted,
            interestedLeads = interested,
            todayFollowUps = todayFollowUps
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardStats(0, 0, 0, 0))

    // List of today's followups
    val todayFollowUpVendors: StateFlow<List<Vendor>> = dataRepository.vendors.map { list ->
        val todayStr = getTodayString()
        list.filter { it.latestFollowUp == todayStr }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // --- Authentication Actions ---

    fun login(email: String, password: String) {
        viewModelScope.launch {
            dataRepository.login(email, password)
        }
    }

    fun logout() {
        viewModelScope.launch {
            dataRepository.logout()
            // Reset filters
            _searchQuery.value = ""
            _selectedState.value = "All"
            _selectedDistrict.value = "All"
            _selectedSort.value = "Name"
            _activeTab.value = "dashboard"
        }
    }

    fun refreshData() {
        viewModelScope.launch {
            dataRepository.fetchData()
        }
    }

    // --- Call Log dialog and action states ---

    private val _selectedVendorForCall = MutableStateFlow<Vendor?>(null)
    val selectedVendorForCall: StateFlow<Vendor?> = _selectedVendorForCall.asStateFlow()

    fun showCallLogDialog(vendor: Vendor) {
        _selectedVendorForCall.value = vendor
    }

    fun dismissCallLogDialog() {
        _selectedVendorForCall.value = null
    }

    fun saveCallLog(outcome: String, note: String, followUpDate: String?) {
        val vendor = _selectedVendorForCall.value ?: return
        viewModelScope.launch {
            dataRepository.logCall(
                vendorId = vendor.id,
                outcome = outcome,
                note = note,
                followUpDate = followUpDate
            )
            dismissCallLogDialog()
        }
    }
}
