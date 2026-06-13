package com.example.solarcrm.data

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// --- Domain Models ---

data class Profile(
    val id: String,
    val email: String,
    val name: String,
    val role: String
)

data class CallLog(
    val id: String,
    val vendorId: Int,
    val timestamp: String,
    val outcome: String,
    val note: String,
    val followUpDate: String?,
    val userId: String,
    val userName: String?
)

data class Vendor(
    val id: Int,
    val vendorId: Int?,
    val vendorName: String,
    val previousVendorName: String?,
    val contactPersonName: String?,
    val contactPersonEmail: String?,
    val contactPersonMobile: String?,
    val address: String,
    val websiteUrl: String?,
    val rating: Double,
    val consumerRatingCount: Int,
    val vendorBrandsList: List<String>,
    val userRequestType: String?,
    val nationwiseCapacity: Double,
    val nationwiseInstalls: Int,
    val statewiseCapacity: Double,
    val statewiseInstalls: Int,
    val districtwiseCapacity: Double,
    val districtwiseInstalls: Int,
    val assignedTo: String?,
    
    // UI-computed fields
    var status: String = "Pending",
    var latestFollowUp: String? = null,
    var assignedName: String? = null,
    var state: String = "Gujarat",
    var district: String = "Other"
)

sealed interface AuthState {
    object LoggedOut : AuthState
    object LoggingIn : AuthState
    data class LoggedIn(
        val accessToken: String,
        val refreshToken: String,
        val userId: String,
        val email: String,
        val name: String,
        val role: String
    ) : AuthState
    data class Error(val message: String) : AuthState
}

// --- Location Parser Helper ---

data class VendorLocation(val state: String, val district: String)

fun getVendorLocation(address: String?): VendorLocation {
    if (address.isNullOrBlank()) return VendorLocation("Unknown", "Unknown")
    val addrLower = address.lowercase(Locale.ROOT)
    
    // 1. Identify State
    var state = "Gujarat"
    val statesList = listOf(
        Pair("Maharashtra", listOf("maharashtra", "mumbai", "pune", "nagpur", "thane")),
        Pair("Delhi", listOf("delhi", "new delhi", "ncr")),
        Pair("Rajasthan", listOf("rajasthan", "jaipur", "jodhpur", "udaipur", "ajmer")),
        Pair("Uttar Pradesh", listOf("uttar pradesh", "up", "noida", "lucknow", "kanpur")),
        Pair("Haryana", listOf("haryana", "gurgaon", "gurugram", "faridabad")),
        Pair("Chhattisgarh", listOf("chhattisgarh", "raipur", "bilaspur")),
        Pair("Goa", listOf("goa", "panaji", "margao")),
        Pair("Punjab", listOf("punjab", "ludhiana", "amritsar")),
        Pair("Bihar", listOf("bihar", "patna")),
        Pair("Odisha", listOf("odisha", "bhubaneswar")),
        Pair("Kerala", listOf("kerala", "kochi", "trivandrum"))
    )
    for (s in statesList) {
        if (s.second.any { addrLower.contains(it) }) {
            state = s.first
            break
        }
    }
    
    // 2. Identify District/City in Gujarat
    var district = "Other"
    val gujaratDistricts = listOf(
        "Ahmedabad", "Surat", "Rajkot", "Vadodara", "Bhavnagar", "Gandhinagar", "Anand", "Junagadh", 
        "Jamnagar", "Mehsana", "Morbi", "Amreli", "Navsari", "Bharuch", "Palanpur", "Banaskantha", 
        "Patan", "Nadiad", "Botad", "Gondal", "Keshod", "Kutch", "Kachchh", "Valsad", "Vyara", 
        "Tapi", "Panchmahal", "Surendranagar", "Godhra", "Vapi", "Ankleshwar", "Bhuj", "Gandhidham",
        "Sanand", "Deesa", "Talod", "Dhoraji", "Babra", "Karamsad", "Padra"
    )
    for (dist in gujaratDistricts) {
        val regex = Regex("\\b${dist.lowercase(Locale.ROOT)}\\b")
        if (regex.containsMatchIn(addrLower)) {
            district = if (dist == "Kachchh") "Kutch" else dist
            break
        }
    }
    
    if (district == "Other") {
        if (addrLower.contains("mumbai") || addrLower.contains("andheri")) district = "Mumbai"
        else if (addrLower.contains("noida")) district = "Noida"
        else if (addrLower.contains("gurgaon") || addrLower.contains("gurugram")) district = "Gurugram"
        else if (addrLower.contains("jaipur")) district = "Jaipur"
    }
    
    return VendorLocation(state, district)
}

// --- DataRepository Interface ---

interface DataRepository {
    val authState: StateFlow<AuthState>
    val vendors: StateFlow<List<Vendor>>
    val callLogs: StateFlow<Map<Int, List<CallLog>>>
    val profiles: StateFlow<List<Profile>>
    val isLoading: StateFlow<Boolean>
    val error: StateFlow<String?>

    suspend fun login(email: String, password: String)
    suspend fun logout()
    suspend fun fetchData()
    suspend fun logCall(vendorId: Int, outcome: String, note: String, followUpDate: String?)
}

// --- DataRepository Implementation ---

class DefaultDataRepository(context: Context) : DataRepository {
    private val TAG = "DataRepository"
    private val prefs = context.applicationContext.getSharedPreferences("solar_crm_prefs", Context.MODE_PRIVATE)

    private val _authState = MutableStateFlow<AuthState>(AuthState.LoggedOut)
    override val authState = _authState.asStateFlow()

    private val _vendors = MutableStateFlow<List<Vendor>>(emptyList())
    override val vendors = _vendors.asStateFlow()

    private val _callLogs = MutableStateFlow<Map<Int, List<CallLog>>>(emptyMap())
    override val callLogs = _callLogs.asStateFlow()

    private val _profiles = MutableStateFlow<List<Profile>>(emptyList())
    override val profiles = _profiles.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    override val isLoading = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    override val error = _error.asStateFlow()

    init {
        // Restore session from cache if exists
        val token = prefs.getString("access_token", null)
        val refreshToken = prefs.getString("refresh_token", null)
        val userId = prefs.getString("user_id", null)
        val email = prefs.getString("email", null)
        val name = prefs.getString("name", null)
        val role = prefs.getString("role", null)

        if (token != null && refreshToken != null && userId != null && email != null && name != null && role != null) {
            _authState.value = AuthState.LoggedIn(token, refreshToken, userId, email, name, role)
        }
    }

    private fun saveSession(session: SupabaseApi.Session) {
        prefs.edit().apply {
            putString("access_token", session.accessToken)
            putString("refresh_token", session.refreshToken)
            putString("user_id", session.userId)
            putString("email", session.email)
            putString("name", session.name)
            putString("role", session.role)
            apply()
        }
        _authState.value = AuthState.LoggedIn(
            accessToken = session.accessToken,
            refreshToken = session.refreshToken,
            userId = session.userId,
            email = session.email,
            name = session.name,
            role = session.role
        )
    }

    override suspend fun login(email: String, password: String) = withContext(Dispatchers.IO) {
        _isLoading.value = true
        _error.value = null
        try {
            val session = SupabaseApi.login(email, password)
            saveSession(session)
            Log.d(TAG, "Login successful, fetching initial data...")
            fetchData()
        } catch (e: Exception) {
            Log.e(TAG, "Login failed", e)
            _authState.value = AuthState.LoggedOut
            _error.value = e.message ?: "Authentication failed"
        } finally {
            _isLoading.value = false
        }
    }

    override suspend fun logout() = withContext(Dispatchers.IO) {
        prefs.edit().clear().apply()
        _authState.value = AuthState.LoggedOut
        _vendors.value = emptyList()
        _callLogs.value = emptyMap()
        _profiles.value = emptyList()
        _error.value = null
    }

    override suspend fun fetchData() = withContext(Dispatchers.IO) {
        val currentAuth = _authState.value
        if (currentAuth !is AuthState.LoggedIn) {
            Log.w(TAG, "fetchData called but not logged in.")
            return@withContext
        }
        _isLoading.value = true
        _error.value = null

        try {
            doFetch(currentAuth.accessToken)
        } catch (e: SupabaseApi.ApiException) {
            if (e.statusCode == 401) {
                Log.d(TAG, "Access token expired, attempting refresh...")
                try {
                    val newSession = SupabaseApi.refreshSession(currentAuth.refreshToken)
                    saveSession(newSession)
                    doFetch(newSession.accessToken)
                } catch (refreshEx: Exception) {
                    Log.e(TAG, "Failed to refresh token", refreshEx)
                    logout()
                }
            } else {
                handleFetchError(e)
            }
        } catch (e: Exception) {
            handleFetchError(e)
        } finally {
            _isLoading.value = false
        }
    }

    private fun handleFetchError(e: Exception) {
        Log.e(TAG, "Error fetching data from Supabase", e)
        val sw = java.io.StringWriter()
        e.printStackTrace(java.io.PrintWriter(sw))
        val stack = sw.toString()
        _error.value = "Failed to load database: ${e.message}\nStack: ${if (stack.length > 300) stack.substring(0, 300) else stack}"
    }

    private suspend fun doFetch(token: String) {
        // 1. Fetch profiles
        val profilesArr = SupabaseApi.fetchProfiles(token)
        val tempProfiles = ArrayList<Profile>()
        val profilesMap = HashMap<String, Profile>()
        for (i in 0 until profilesArr.length()) {
            val pObj = profilesArr.getJSONObject(i)
            val p = Profile(
                id = pObj.getString("id"),
                email = pObj.getString("email"),
                name = pObj.optString("name", pObj.getString("email").substringBefore("@")),
                role = pObj.optString("role", "user")
            )
            tempProfiles.add(p)
            profilesMap[p.id] = p
        }
        _profiles.value = tempProfiles

        // 2. Fetch call logs
        val logsArr = SupabaseApi.fetchCallLogs(token)
        val tempLogsMap = HashMap<Int, MutableList<CallLog>>()
        for (i in 0 until logsArr.length()) {
            val lObj = logsArr.getJSONObject(i)
            val vendorId = lObj.getInt("vendor_id")
            val userId = lObj.getString("user_id")
            val profile = profilesMap[userId]
            val userName = profile?.name ?: userId.substringBefore("-")

            val logEntry = CallLog(
                id = lObj.getString("id"),
                vendorId = vendorId,
                timestamp = lObj.optString("timestamp", ""),
                outcome = lObj.getString("outcome"),
                note = lObj.optString("note", ""),
                followUpDate = if (lObj.isNull("follow_up_date")) null else lObj.optString("follow_up_date", null),
                userId = userId,
                userName = userName
            )
            if (!tempLogsMap.containsKey(vendorId)) {
                tempLogsMap[vendorId] = ArrayList()
            }
            tempLogsMap[vendorId]?.add(logEntry)
        }
        _callLogs.value = tempLogsMap.mapValues { it.value.toList() }

        // 3. Fetch vendors
        val vendorsArr = SupabaseApi.fetchVendors(token)
        val tempVendors = ArrayList<Vendor>()
        for (i in 0 until vendorsArr.length()) {
            val vObj = vendorsArr.getJSONObject(i)
            val id = vObj.getInt("id")
            val assignedTo = if (vObj.isNull("assigned_to")) null else vObj.optString("assigned_to", null)
            val addressStr = vObj.optString("address", "")
            val loc = getVendorLocation(addressStr)

            // Retrieve brand list
            val brandsList = ArrayList<String>()
            if (!vObj.isNull("vendor_brands_list")) {
                val brandsArr = vObj.optJSONArray("vendor_brands_list")
                if (brandsArr != null) {
                    for (bIdx in 0 until brandsArr.length()) {
                        brandsList.add(brandsArr.getString(bIdx))
                    }
                }
            }

            val vendorObj = Vendor(
                id = id,
                vendorId = if (vObj.isNull("vendor_id")) null else vObj.optInt("vendor_id"),
                vendorName = vObj.optString("vendor_name", "Unnamed Vendor"),
                previousVendorName = if (vObj.isNull("previous_vendor_name")) null else vObj.optString("previous_vendor_name", null),
                contactPersonName = if (vObj.isNull("contact_person_name")) null else vObj.optString("contact_person_name", null),
                contactPersonEmail = if (vObj.isNull("contact_person_email")) null else vObj.optString("contact_person_email", null),
                contactPersonMobile = if (vObj.isNull("contact_person_mobile")) null else vObj.optString("contact_person_mobile", null),
                address = addressStr,
                websiteUrl = if (vObj.isNull("website_url")) null else vObj.optString("website_url", null),
                rating = vObj.optDouble("rating", 0.0),
                consumerRatingCount = vObj.optInt("consumer_rating_count", 0),
                vendorBrandsList = brandsList,
                userRequestType = if (vObj.isNull("user_request_type")) null else vObj.optString("user_request_type", null),
                nationwiseCapacity = vObj.optDouble("nationwise_capacity", 0.0),
                nationwiseInstalls = vObj.optInt("nationwise_installs", 0),
                statewiseCapacity = vObj.optDouble("statewise_capacity", 0.0),
                statewiseInstalls = vObj.optInt("statewise_installs", 0),
                districtwiseCapacity = vObj.optDouble("districtwise_capacity", 0.0),
                districtwiseInstalls = vObj.optInt("districtwise_installs", 0),
                assignedTo = assignedTo,
                state = loc.state,
                district = loc.district
            )

            // Calculate in-memory merged states
            val logsList = tempLogsMap[id] ?: emptyList()
            vendorObj.status = if (logsList.isNotEmpty()) logsList.first().outcome else "Pending"

            // Find latest follow up
            val logWithFollowUp = logsList.firstOrNull { !it.followUpDate.isNullOrBlank() }
            vendorObj.latestFollowUp = logWithFollowUp?.followUpDate

            // Resolve assignee name
            if (assignedTo != null) {
                vendorObj.assignedName = profilesMap[assignedTo]?.name
            }

            tempVendors.add(vendorObj)
        }
        _vendors.value = tempVendors
        Log.d(TAG, "Successfully synced ${tempVendors.size} vendors and ${logsArr.length()} call logs.")
    }

    override suspend fun logCall(
        vendorId: Int,
        outcome: String,
        note: String,
        followUpDate: String?
    ) = withContext(Dispatchers.IO) {
        val currentAuth = _authState.value
        if (currentAuth !is AuthState.LoggedIn) {
            Log.w(TAG, "logCall called but not logged in.")
            return@withContext
        }

        _isLoading.value = true
        _error.value = null

        try {
            val token = currentAuth.accessToken
            val userId = currentAuth.userId

            // 1. Insert Call Log
            val logSuccess = SupabaseApi.insertCallLog(
                token = token,
                vendorId = vendorId,
                outcome = outcome,
                note = note,
                followUpDate = followUpDate,
                userId = userId
            )
            if (!logSuccess) throw Exception("Failed to insert call log record.")

            // 2. Assign Vendor to User
            val assignSuccess = SupabaseApi.updateVendorAssignee(
                token = token,
                vendorId = vendorId,
                userId = userId
            )
            if (!assignSuccess) throw Exception("Failed to update lead assignee.")

            Log.d(TAG, "Call logged successfully for vendorId=$vendorId. Refreshing...")
            fetchData()
        } catch (e: Exception) {
            Log.e(TAG, "Error logging call", e)
            _error.value = e.message ?: "Failed to log call outcome."
        } finally {
            _isLoading.value = false
        }
    }
}
