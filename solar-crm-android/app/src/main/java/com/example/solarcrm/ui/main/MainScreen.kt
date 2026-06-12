package com.example.solarcrm.ui.main

import android.app.DatePickerDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.solarcrm.data.AuthState
import com.example.solarcrm.data.CallLog
import com.example.solarcrm.data.DefaultDataRepository
import com.example.solarcrm.data.Vendor
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

// --- Sleek Dark Color Palette ---
private val DarkBg = Color(0xFF020617)      // slate-950
private val SurfaceBg = Color(0xFF0F172A)   // slate-900
private val CardBg = Color(0xFF1E293B)      // slate-800
private val BorderColor = Color(0xFF334155)  // slate-700
private val AccentCyan = Color(0xFF06B6D4)   // cyan-500
private val AccentTeal = Color(0xFF14B8A6)   // teal-500
private val TextPrimary = Color(0xFFF8FAFC)  // slate-50
private val TextSecondary = Color(0xFF94A3B8)// slate-400

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    modifier: Modifier = Modifier
) {
    val appContext = LocalContext.current.applicationContext
    val viewModel: MainScreenViewModel = viewModel {
        MainScreenViewModel(DefaultDataRepository(appContext))
    }
    val authState by viewModel.authState.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()

    val context = LocalContext.current

    // Show API error messages as native Toast alerts
    LaunchedEffect(error) {
        error?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBg)
    ) {
        when (val auth = authState) {
            is AuthState.LoggedOut, is AuthState.Error -> {
                LoginScreen(
                    isLoading = isLoading,
                    onLoginClick = { email, password ->
                        viewModel.login(email, password)
                    }
                )
            }
            is AuthState.LoggingIn -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = AccentCyan)
                }
            }
            is AuthState.LoggedIn -> {
                AuthenticatedApp(
                    session = auth,
                    viewModel = viewModel,
                    isLoading = isLoading
                )
            }
        }
    }
}

// --- LOGIN SCREEN ---
@Composable
fun LoginScreen(
    isLoading: Boolean,
    onLoginClick: (String, String) -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, BorderColor, RoundedCornerShape(24.dp)),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceBg)
        ) {
            Column(
                modifier = Modifier
                    .padding(32.dp)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Glow logo icon
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .background(
                            Brush.linearGradient(listOf(AccentCyan, AccentTeal)),
                            RoundedCornerShape(16.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Home,
                        contentDescription = "Logo",
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = "Solar CRM Login",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = "Enter credentials to access client lead base",
                    fontSize = 12.sp,
                    color = TextSecondary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
                )

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email Address", color = TextSecondary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = AccentCyan,
                        unfocusedBorderColor = BorderColor
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password", color = TextSecondary) },
                    singleLine = true,
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Default.Info else Icons.Default.Lock,
                                contentDescription = "Toggle password visibility",
                                tint = TextSecondary
                            )
                        }
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = AccentCyan,
                        unfocusedBorderColor = BorderColor
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                )

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = { onLoginClick(email, password) },
                    enabled = !isLoading && email.isNotBlank() && password.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentCyan),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    } else {
                        Text("Sign In", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                }
            }
        }
    }
}

// --- AUTHENTICATED CONTAINER LAYOUT ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthenticatedApp(
    session: AuthState.LoggedIn,
    viewModel: MainScreenViewModel,
    isLoading: Boolean
) {
    val activeTab by viewModel.activeTab.collectAsStateWithLifecycle()
    val selectedVendorForCall by viewModel.selectedVendorForCall.collectAsStateWithLifecycle()
    val callLogsMap by viewModel.callLogs.collectAsStateWithLifecycle()

    var selectedVendorForDetails by remember { mutableStateOf<Vendor?>(null) }

    // Load database on launch
    LaunchedEffect(Unit) {
        viewModel.refreshData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Solar CRM", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                        if (isLoading) {
                            Spacer(modifier = Modifier.width(12.dp))
                            CircularProgressIndicator(color = AccentCyan, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refreshData() }) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = "Sync Data", tint = AccentCyan)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SurfaceBg)
            )
        },
        bottomBar = {
            NavigationBar(containerColor = SurfaceBg) {
                NavigationBarItem(
                    selected = activeTab == "dashboard",
                    onClick = { viewModel.updateActiveTab("dashboard") },
                    icon = { Icon(Icons.Default.Home, contentDescription = "Dashboard") },
                    label = { Text("Dashboard") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AccentCyan,
                        selectedTextColor = AccentCyan,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary,
                        indicatorColor = SurfaceBg
                    )
                )
                NavigationBarItem(
                    selected = activeTab == "directory",
                    onClick = { viewModel.updateActiveTab("directory") },
                    icon = { Icon(Icons.Default.Search, contentDescription = "Directory") },
                    label = { Text("Directory") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AccentCyan,
                        selectedTextColor = AccentCyan,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary,
                        indicatorColor = SurfaceBg
                    )
                )
                NavigationBarItem(
                    selected = activeTab == "calendar",
                    onClick = { viewModel.updateActiveTab("calendar") },
                    icon = { Icon(Icons.Default.DateRange, contentDescription = "Calendar") },
                    label = { Text("Calendar") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AccentCyan,
                        selectedTextColor = AccentCyan,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary,
                        indicatorColor = SurfaceBg
                    )
                )
                NavigationBarItem(
                    selected = activeTab == "profile",
                    onClick = { viewModel.updateActiveTab("profile") },
                    icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                    label = { Text("Profile") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AccentCyan,
                        selectedTextColor = AccentCyan,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary,
                        indicatorColor = SurfaceBg
                    )
                )
            }
        },
        containerColor = DarkBg
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (activeTab) {
                "dashboard" -> DashboardScreen(
                    session = session,
                    viewModel = viewModel,
                    onVendorClick = { selectedVendorForDetails = it }
                )
                "directory" -> DirectoryScreen(
                    viewModel = viewModel,
                    onVendorClick = { selectedVendorForDetails = it }
                )
                "calendar" -> CalendarScreen(
                    viewModel = viewModel,
                    onVendorClick = { selectedVendorForDetails = it }
                )
                "profile" -> ProfileScreen(session = session, onLogout = { viewModel.logout() })
            }

            // Call Log outcome submission dialog
            selectedVendorForCall?.let { vendor ->
                LogCallDialog(
                    vendor = vendor,
                    onDismiss = { viewModel.dismissCallLogDialog() },
                    onSave = { outcome, note, followUpDate ->
                        viewModel.saveCallLog(outcome, note, followUpDate)
                    }
                )
            }

            // Lead details dialog
            selectedVendorForDetails?.let { vendor ->
                val latestVendor = viewModel.filteredVendors.collectAsStateWithLifecycle().value.find { it.id == vendor.id } ?: vendor
                val logs = callLogsMap[latestVendor.id] ?: emptyList<CallLog>()
                LeadDetailsDialog(
                    vendor = latestVendor,
                    callLogs = logs,
                    onDismiss = { selectedVendorForDetails = null },
                    onCallLogClick = { viewModel.showCallLogDialog(latestVendor) }
                )
            }
        }
    }
}

// --- DASHBOARD SCREEN ---
@Composable
fun DashboardScreen(
    session: AuthState.LoggedIn,
    viewModel: MainScreenViewModel,
    onVendorClick: (Vendor) -> Unit
) {
    val stats by viewModel.dashboardStats.collectAsStateWithLifecycle()
    val todayFollowUps by viewModel.todayFollowUpVendors.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Welcome Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, BorderColor, RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceBg)
        ) {
            Row(
                modifier = Modifier
                    .padding(20.dp)
                    .fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(AccentTeal, RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Person, contentDescription = "User", tint = Color.White)
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text("Hello, ${session.name}!", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text("Role: ${session.role.uppercase()}", color = AccentCyan, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Grid Metrics Layout
        Row(modifier = Modifier.fillMaxWidth()) {
            StatCard(title = "Total Leads", count = stats.totalLeads.toString(), modifier = Modifier.weight(1f))
            Spacer(modifier = Modifier.width(12.dp))
            StatCard(title = "Contacted", count = stats.contactedLeads.toString(), modifier = Modifier.weight(1f))
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(modifier = Modifier.fillMaxWidth()) {
            StatCard(title = "Interested", count = stats.interestedLeads.toString(), modifier = Modifier.weight(1f))
            Spacer(modifier = Modifier.width(12.dp))
            StatCard(title = "Today's Follow-ups", count = stats.todayFollowUps.toString(), modifier = Modifier.weight(1f), isAlert = stats.todayFollowUps > 0)
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text("Today's Schedule Action Items", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Text("Leads expecting callbacks or follow-ups today", color = TextSecondary, fontSize = 11.sp)

        Spacer(modifier = Modifier.height(12.dp))

        if (todayFollowUps.isEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceBg)
            ) {
                Text(
                    text = "No follow-ups scheduled for today. Clean sweep!",
                    color = TextSecondary,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .padding(24.dp)
                        .fillMaxWidth()
                )
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(todayFollowUps, key = { it.id }) { vendor ->
                    VendorItemCard(
                        vendor = vendor,
                        onCallLogClick = { viewModel.showCallLogDialog(vendor) },
                        onCardClick = { onVendorClick(vendor) }
                    )
                }
            }
        }
    }
}

@Composable
fun StatCard(
    title: String,
    count: String,
    modifier: Modifier = Modifier,
    isAlert: Boolean = false
) {
    Card(
        modifier = modifier.border(
            width = 1.dp,
            color = if (isAlert) AccentCyan else BorderColor,
            shape = RoundedCornerShape(16.dp)
        ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceBg)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(title, color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                count,
                color = if (isAlert) AccentCyan else TextPrimary,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

// --- DIRECTORY SCREEN ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DirectoryScreen(
    viewModel: MainScreenViewModel,
    onVendorClick: (Vendor) -> Unit
) {
    val searchVal by viewModel.searchQuery.collectAsStateWithLifecycle()
    val selectedState by viewModel.selectedState.collectAsStateWithLifecycle()
    val selectedDistrict by viewModel.selectedDistrict.collectAsStateWithLifecycle()
    val selectedSort by viewModel.selectedSort.collectAsStateWithLifecycle()

    val availableStates by viewModel.availableStates.collectAsStateWithLifecycle()
    val availableDistricts by viewModel.availableDistricts.collectAsStateWithLifecycle()
    val filteredVendors by viewModel.filteredVendors.collectAsStateWithLifecycle()

    var stateExpanded by remember { mutableStateOf(false) }
    var districtExpanded by remember { mutableStateOf(false) }
    var sortExpanded by remember { mutableStateOf(false) }

    val sortOptions = listOf(
        "Name",
        "Nation-wide Capacity",
        "State-wide Capacity",
        "District-wide Capacity",
        "Nation-wide Installs",
        "State-wide Installs",
        "District-wide Installs"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Search Input
        OutlinedTextField(
            value = searchVal,
            onValueChange = { viewModel.updateSearchQuery(it) },
            placeholder = { Text("Search by name, contact, mobile, brands...", color = TextSecondary) },
            singleLine = true,
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search icon", tint = TextSecondary) },
            trailingIcon = {
                if (searchVal.isNotEmpty()) {
                    IconButton(onClick = { viewModel.updateSearchQuery("") }) {
                        Icon(Icons.Default.Clear, contentDescription = "Clear search", tint = TextSecondary)
                    }
                }
            },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary,
                focusedBorderColor = AccentCyan,
                unfocusedBorderColor = BorderColor
            ),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Filters row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // State filter
            Box(modifier = Modifier.weight(1f)) {
                Button(
                    onClick = { stateExpanded = true },
                    colors = ButtonDefaults.buttonColors(containerColor = SurfaceBg),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                    modifier = Modifier.fillMaxWidth().border(1.dp, BorderColor, RoundedCornerShape(8.dp))
                ) {
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "State: $selectedState",
                            color = TextPrimary,
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = AccentCyan, modifier = Modifier.size(16.dp))
                    }
                }
                DropdownMenu(
                    expanded = stateExpanded,
                    onDismissRequest = { stateExpanded = false },
                    modifier = Modifier.background(SurfaceBg).border(1.dp, BorderColor)
                ) {
                    availableStates.forEach { stateName ->
                        DropdownMenuItem(
                            text = { Text(stateName, color = TextPrimary) },
                            onClick = {
                                viewModel.updateSelectedState(stateName)
                                stateExpanded = false
                            }
                        )
                    }
                }
            }

            // District filter
            Box(modifier = Modifier.weight(1f)) {
                Button(
                    onClick = { districtExpanded = true },
                    colors = ButtonDefaults.buttonColors(containerColor = SurfaceBg),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                    modifier = Modifier.fillMaxWidth().border(1.dp, BorderColor, RoundedCornerShape(8.dp))
                ) {
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Dist: $selectedDistrict",
                            color = TextPrimary,
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = AccentCyan, modifier = Modifier.size(16.dp))
                    }
                }
                DropdownMenu(
                    expanded = districtExpanded,
                    onDismissRequest = { districtExpanded = false },
                    modifier = Modifier.background(SurfaceBg).border(1.dp, BorderColor)
                ) {
                    availableDistricts.forEach { districtName ->
                        DropdownMenuItem(
                            text = { Text(districtName, color = TextPrimary) },
                            onClick = {
                                viewModel.updateSelectedDistrict(districtName)
                                districtExpanded = false
                            }
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Sort selector
        Box(modifier = Modifier.fillMaxWidth()) {
            Button(
                onClick = { sortExpanded = true },
                colors = ButtonDefaults.buttonColors(containerColor = SurfaceBg),
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                modifier = Modifier.fillMaxWidth().border(1.dp, BorderColor, RoundedCornerShape(8.dp))
            ) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Sort by: $selectedSort",
                        color = TextPrimary,
                        fontSize = 12.sp
                    )
                    Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = AccentCyan, modifier = Modifier.size(18.dp))
                }
            }
            DropdownMenu(
                expanded = sortExpanded,
                onDismissRequest = { sortExpanded = false },
                modifier = Modifier.fillMaxWidth(0.9f).background(SurfaceBg).border(1.dp, BorderColor)
            ) {
                sortOptions.forEach { opt ->
                    DropdownMenuItem(
                        text = { Text(opt, color = TextPrimary) },
                        onClick = {
                            viewModel.updateSelectedSort(opt)
                            sortExpanded = false
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Results: ${filteredVendors.size} leads matching",
            color = AccentTeal,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        if (filteredVendors.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No matching leads found.", color = TextSecondary)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(filteredVendors, key = { it.id }) { vendor ->
                    VendorItemCard(
                        vendor = vendor,
                        onCallLogClick = { viewModel.showCallLogDialog(vendor) },
                        onCardClick = { onVendorClick(vendor) }
                    )
                }
            }
        }
    }
}

// --- VENDOR ITEM LIST CARD ---
@Composable
fun VendorItemCard(
    vendor: Vendor,
    onCallLogClick: () -> Unit,
    onCardClick: () -> Unit
) {
    val context = LocalContext.current

    val statusColors = when (vendor.status) {
        "Interested" -> Pair(Color(0xFF065F46), Color(0xFF34D399))
        "Callback" -> Pair(Color(0xFF78350F), Color(0xFFFBBF24))
        "Uninterested" -> Pair(Color(0xFF991B1B), Color(0xFFFCA5A5))
        else -> Pair(Color(0xFF334155), Color(0xFF94A3B8)) // Pending
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BorderColor, RoundedCornerShape(16.dp))
            .clickable { onCardClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceBg)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Vendor Title and Status badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = vendor.vendorName,
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                // Status badge
                Box(
                    modifier = Modifier
                        .background(statusColors.first, RoundedCornerShape(8.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = if (vendor.status == "Pending") "Pending" else vendor.status,
                        color = statusColors.second,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // State & District subtitle
            Text(
                text = "📍 ${vendor.state} > ${vendor.district}",
                color = AccentCyan,
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp
            )

            // Address
            Text(
                text = vendor.address,
                color = TextSecondary,
                fontSize = 11.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 4.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Capacities (Stacked Capacity & Installations vertically)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Nationwide", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                    Text("${vendor.nationwiseCapacity} kW", color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text("${vendor.nationwiseInstalls} installs", color = AccentTeal, fontSize = 10.sp, fontWeight = FontWeight.Medium)
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text("Statewide", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                    Text("${vendor.statewiseCapacity} kW", color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text("${vendor.statewiseInstalls} installs", color = AccentTeal, fontSize = 10.sp, fontWeight = FontWeight.Medium)
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text("District-wide", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                    Text("${vendor.districtwiseCapacity} kW", color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text("${vendor.districtwiseInstalls} installs", color = AccentTeal, fontSize = 10.sp, fontWeight = FontWeight.Medium)
                }
            }

            // Assignee and Followup details
            if (vendor.assignedName != null || vendor.latestFollowUp != null) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = BorderColor)
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    vendor.assignedName?.let {
                        Text(
                            text = "Assigned: $it",
                            color = AccentTeal,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    vendor.latestFollowUp?.let {
                        Text(
                            text = "Follow up: $it",
                            color = TextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Action Triggers Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Dialer Button
                Button(
                    onClick = {
                        val mobile = vendor.contactPersonMobile
                        if (!mobile.isNullOrBlank()) {
                            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$mobile"))
                            context.startActivity(intent)
                        } else {
                            Toast.makeText(context, "No contact number listed", Toast.LENGTH_SHORT).show()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CardBg),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    modifier = Modifier.weight(1f).border(1.dp, BorderColor, RoundedCornerShape(8.dp))
                ) {
                    Icon(Icons.Default.Phone, contentDescription = null, tint = AccentCyan, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Call", color = TextPrimary, fontSize = 12.sp)
                }

                // WhatsApp Button
                Button(
                    onClick = {
                        val mobile = vendor.contactPersonMobile
                        if (!mobile.isNullOrBlank()) {
                            val cleaned = mobile.replace(Regex("\\D"), "")
                            if (cleaned.isNotEmpty()) {
                                val formatted = if (cleaned.length == 10) "91$cleaned" else cleaned
                                val url = "https://wa.me/$formatted"
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                context.startActivity(intent)
                            } else {
                                Toast.makeText(context, "Invalid number formatted", Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            Toast.makeText(context, "No contact number listed", Toast.LENGTH_SHORT).show()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CardBg),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    modifier = Modifier.weight(1.2f).border(1.dp, BorderColor, RoundedCornerShape(8.dp))
                ) {
                    Icon(Icons.Default.Send, contentDescription = null, tint = AccentTeal, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("WhatsApp", color = TextPrimary, fontSize = 12.sp, maxLines = 1)
                }

                // Log outcome Button
                Button(
                    onClick = onCallLogClick,
                    colors = ButtonDefaults.buttonColors(containerColor = AccentCyan),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    modifier = Modifier.weight(1.3f)
                ) {
                    Icon(Icons.Default.Edit, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Log Call", color = Color.White, fontSize = 12.sp, maxLines = 1)
                }
            }
        }
    }
}

// --- LEAD DETAILS DIALOG POPUP ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeadDetailsDialog(
    vendor: Vendor,
    callLogs: List<CallLog>,
    onDismiss: () -> Unit,
    onCallLogClick: () -> Unit
) {
    val context = LocalContext.current

    val statusColors = when (vendor.status) {
        "Interested" -> Pair(Color(0xFF065F46), Color(0xFF34D399))
        "Callback" -> Pair(Color(0xFF78350F), Color(0xFFFBBF24))
        "Uninterested" -> Pair(Color(0xFF991B1B), Color(0xFFFCA5A5))
        else -> Pair(Color(0xFF334155), Color(0xFF94A3B8)) // Pending
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = vendor.vendorName,
                    color = TextPrimary,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Clear, contentDescription = "Close", tint = TextSecondary)
                }
            }
        },
        text = {
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    // Status & location
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .background(statusColors.first, RoundedCornerShape(8.dp))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(vendor.status, color = statusColors.second, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                        }
                        Text("📍 ${vendor.state} > ${vendor.district}", color = AccentCyan, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                    }
                }

                item {
                    // Contact Info card
                    Card(
                        colors = CardDefaults.cardColors(containerColor = CardBg),
                        modifier = Modifier.fillMaxWidth().border(1.dp, BorderColor, RoundedCornerShape(12.dp)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Contact Details", color = AccentTeal, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            
                            vendor.contactPersonName?.let {
                                Text("👤 Person: $it", color = TextPrimary, fontSize = 12.sp)
                            }
                            vendor.contactPersonMobile?.let {
                                Text("📞 Mobile: $it", color = TextPrimary, fontSize = 12.sp)
                            }
                            vendor.contactPersonEmail?.let {
                                Text("✉️ Email: $it", color = TextPrimary, fontSize = 12.sp)
                            }
                            vendor.websiteUrl?.let { url ->
                                Text("🌐 Website: $url", color = AccentCyan, fontSize = 12.sp, modifier = Modifier.clickable {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(if (url.startsWith("http")) url else "https://$url"))
                                    context.startActivity(intent)
                                })
                            }
                            Text("🏠 Address: ${vendor.address}", color = TextSecondary, fontSize = 12.sp)
                        }
                    }
                }

                item {
                    // Rating & Brands
                    Card(
                        colors = CardDefaults.cardColors(containerColor = CardBg),
                        modifier = Modifier.fillMaxWidth().border(1.dp, BorderColor, RoundedCornerShape(12.dp)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Rating & Request Type", color = AccentTeal, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text("⭐ Rating: ${vendor.rating} / 5.0 (${vendor.consumerRatingCount} reviews)", color = TextPrimary, fontSize = 12.sp)
                            vendor.userRequestType?.let {
                                Text("Type: $it", color = TextPrimary, fontSize = 12.sp)
                            }
                            if (vendor.vendorBrandsList.isNotEmpty()) {
                                Text("Brands:", color = TextSecondary, fontSize = 12.sp)
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    vendor.vendorBrandsList.forEach { brand ->
                                        Box(
                                            modifier = Modifier
                                                .background(BorderColor, RoundedCornerShape(6.dp))
                                                .padding(horizontal = 8.dp, vertical = 2.dp)
                                        ) {
                                            Text(brand, color = TextPrimary, fontSize = 10.sp)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    // Capacities detail
                    Card(
                        colors = CardDefaults.cardColors(containerColor = CardBg),
                        modifier = Modifier.fillMaxWidth().border(1.dp, BorderColor, RoundedCornerShape(12.dp)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Solar Capacities & Installations", color = AccentTeal, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Nationwide", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                    Text("${vendor.nationwiseCapacity} kW", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                    Text("${vendor.nationwiseInstalls} installs", color = AccentTeal, fontSize = 11.sp)
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Statewide", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                    Text("${vendor.statewiseCapacity} kW", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                    Text("${vendor.statewiseInstalls} installs", color = AccentTeal, fontSize = 11.sp)
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("District-wide", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                    Text("${vendor.districtwiseCapacity} kW", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                    Text("${vendor.districtwiseInstalls} installs", color = AccentTeal, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }

                item {
                    // Call History Timeline
                    Text("Call History Logs", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    if (callLogs.isEmpty()) {
                        Text("No discussions logged yet.", color = TextSecondary, fontSize = 12.sp, modifier = Modifier.padding(vertical = 8.dp))
                    }
                }

                items(callLogs) { log ->
                    val logOutcomeColors = when (log.outcome) {
                        "Interested" -> Pair(Color(0xFF065F46), Color(0xFF34D399))
                        "Callback" -> Pair(Color(0xFF78350F), Color(0xFFFBBF24))
                        "Uninterested" -> Pair(Color(0xFF991B1B), Color(0xFFFCA5A5))
                        else -> Pair(Color(0xFF334155), Color(0xFF94A3B8))
                    }
                    Card(
                        colors = CardDefaults.cardColors(containerColor = CardBg),
                        modifier = Modifier.fillMaxWidth().border(1.dp, BorderColor, RoundedCornerShape(8.dp)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .background(logOutcomeColors.first, RoundedCornerShape(6.dp))
                                        .padding(horizontal = 8.dp, vertical = 2.dp)
                                ) {
                                    Text(log.outcome, color = logOutcomeColors.second, fontWeight = FontWeight.Bold, fontSize = 9.sp)
                                }
                                Text(
                                    text = if (log.timestamp.length > 10) log.timestamp.substring(0, 10) else log.timestamp,
                                    color = TextSecondary,
                                    fontSize = 10.sp
                                )
                            }
                            Text(log.note, color = TextPrimary, fontSize = 11.sp)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("By: ${log.userName}", color = AccentTeal, fontSize = 9.sp)
                                log.followUpDate?.let {
                                    Text("Follow up: $it", color = AccentCyan, fontSize = 9.sp)
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Dial Button
                Button(
                    onClick = {
                        val mobile = vendor.contactPersonMobile
                        if (!mobile.isNullOrBlank()) {
                            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$mobile"))
                            context.startActivity(intent)
                        } else {
                            Toast.makeText(context, "No contact number listed", Toast.LENGTH_SHORT).show()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CardBg),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    modifier = Modifier.weight(1f).border(1.dp, BorderColor, RoundedCornerShape(8.dp))
                ) {
                    Icon(Icons.Default.Phone, contentDescription = null, tint = AccentCyan, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Call", color = TextPrimary, fontSize = 12.sp)
                }

                // WhatsApp Button
                Button(
                    onClick = {
                        val mobile = vendor.contactPersonMobile
                        if (!mobile.isNullOrBlank()) {
                            val cleaned = mobile.replace(Regex("\\D"), "")
                            if (cleaned.isNotEmpty()) {
                                val formatted = if (cleaned.length == 10) "91$cleaned" else cleaned
                                val url = "https://wa.me/$formatted"
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                context.startActivity(intent)
                            } else {
                                Toast.makeText(context, "Invalid number formatted", Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            Toast.makeText(context, "No contact number listed", Toast.LENGTH_SHORT).show()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CardBg),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    modifier = Modifier.weight(1.2f).border(1.dp, BorderColor, RoundedCornerShape(8.dp))
                ) {
                    Icon(Icons.Default.Send, contentDescription = null, tint = AccentTeal, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("WhatsApp", color = TextPrimary, fontSize = 12.sp, maxLines = 1)
                }

                // Log outcome Button
                Button(
                    onClick = {
                        onDismiss()
                        onCallLogClick()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AccentCyan),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.weight(1.3f)
                ) {
                    Icon(Icons.Default.Edit, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Log Call", color = Color.White, fontSize = 12.sp, maxLines = 1)
                }
            }
        },
        containerColor = SurfaceBg,
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier.fillMaxWidth(0.95f).fillMaxHeight(0.85f)
    )
}

// --- PROFILE SCREEN ---
@Composable
fun ProfileScreen(
    session: AuthState.LoggedIn,
    onLogout: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, BorderColor, RoundedCornerShape(20.dp)),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceBg)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(AccentCyan, RoundedCornerShape(40.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(40.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(session.name, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Text(session.email, color = TextSecondary, fontSize = 13.sp)

                Spacer(modifier = Modifier.height(20.dp))
                HorizontalDivider(color = BorderColor)
                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("User Role", color = TextSecondary, fontSize = 14.sp)
                    Text(session.role.uppercase(), color = AccentCyan, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Database Server", color = TextSecondary, fontSize = 14.sp)
                    Text("Supabase Cloud", color = AccentTeal, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                }

                Spacer(modifier = Modifier.height(32.dp))

                Button(
                    onClick = onLogout,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF991B1B)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                ) {
                    Icon(Icons.Default.Lock, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Log Out", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// --- CALL LOG INPUT DIALOG ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogCallDialog(
    vendor: Vendor,
    onDismiss: () -> Unit,
    onSave: (outcome: String, note: String, followUpDate: String?) -> Unit
) {
    val context = LocalContext.current

    var selectedOutcome by remember { mutableStateOf("Interested") }
    var note by remember { mutableStateOf("") }
    var followUpDate by remember { mutableStateOf<String?>(null) }

    val outcomes = listOf(
        Pair("Interested", "Interested Lead"),
        Pair("Callback", "Schedule Callback"),
        Pair("Uninterested", "Not Interested")
    )

    // Setup datepicker dialog
    val calendar = Calendar.getInstance()
    val datePickerDialog = DatePickerDialog(
        context,
        { _, year, monthOfYear, dayOfMonth ->
            val cal = Calendar.getInstance()
            cal.set(Calendar.YEAR, year)
            cal.set(Calendar.MONTH, monthOfYear)
            cal.set(Calendar.DAY_OF_MONTH, dayOfMonth)
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            followUpDate = sdf.format(cal.time)
        },
        calendar.get(Calendar.YEAR),
        calendar.get(Calendar.MONTH),
        calendar.get(Calendar.DAY_OF_MONTH)
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Log call for ${vendor.vendorName}",
                color = TextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Outcome selectors
                Text("Select Outcome", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    outcomes.forEach { pair ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedOutcome = pair.first }
                                .padding(vertical = 4.dp)
                        ) {
                            RadioButton(
                                selected = selectedOutcome == pair.first,
                                onClick = { selectedOutcome = pair.first },
                                colors = RadioButtonDefaults.colors(selectedColor = AccentCyan, unselectedColor = BorderColor)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(pair.second, color = TextPrimary, fontSize = 14.sp)
                        }
                    }
                }

                // Follow up date selector
                Text("Next Follow-up Date (Optional)", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Button(
                        onClick = { datePickerDialog.show() },
                        colors = ButtonDefaults.buttonColors(containerColor = CardBg),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f).border(1.dp, BorderColor, RoundedCornerShape(8.dp))
                    ) {
                        Text(
                            text = followUpDate ?: "Select Date",
                            color = if (followUpDate == null) TextSecondary else AccentCyan,
                            fontSize = 13.sp
                        )
                    }
                    if (followUpDate != null) {
                        Spacer(modifier = Modifier.width(8.dp))
                        IconButton(onClick = { followUpDate = null }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear date", tint = Color(0xFFEF4444))
                        }
                    }
                }

                // Notes Description
                Text("Call Update Notes", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    placeholder = { Text("Describe discussion details...", color = TextSecondary) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = AccentCyan,
                        unfocusedBorderColor = BorderColor
                    ),
                    modifier = Modifier.fillMaxWidth().height(80.dp),
                    shape = RoundedCornerShape(8.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(selectedOutcome, note, followUpDate) },
                colors = ButtonDefaults.buttonColors(containerColor = AccentCyan),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Save Log", color = Color.White, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = TextSecondary)
            }
        },
        containerColor = SurfaceBg,
        shape = RoundedCornerShape(16.dp)
    )
}

// --- CALENDAR VIEW SCREEN ---
@Composable
fun CalendarScreen(
    viewModel: MainScreenViewModel,
    onVendorClick: (Vendor) -> Unit
) {
    val context = LocalContext.current
    val calendarMonthDate by viewModel.calendarMonthDate.collectAsStateWithLifecycle()
    val selectedCalendarDay by viewModel.selectedCalendarDay.collectAsStateWithLifecycle()
    val calendarFollowUpDates by viewModel.calendarFollowUpDates.collectAsStateWithLifecycle()
    val selectedDayFollowUps by viewModel.selectedDayFollowUps.collectAsStateWithLifecycle()

    val monthFormat = remember { SimpleDateFormat("MMMM yyyy", Locale.getDefault()) }
    val cellDateFormat = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()) }
    val dayNumberFormat = remember { SimpleDateFormat("d", Locale.getDefault()) }
    val todayString = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) }

    // Generate grid days for the month
    val daysList = remember(calendarMonthDate) {
        val cal = Calendar.getInstance()
        cal.time = calendarMonthDate
        cal.set(Calendar.DAY_OF_MONTH, 1)
        val firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
        val maxDays = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        
        val list = mutableListOf<Date?>()
        // Pad days before the first day of the month
        for (i in 1 until firstDayOfWeek) {
            list.add(null)
        }
        // Add current month days
        for (day in 1..maxDays) {
            cal.set(Calendar.DAY_OF_MONTH, day)
            list.add(cal.time)
        }
        list
    }
    val weeks = daysList.chunked(7)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Month Navigation Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { viewModel.prevMonth() }) {
                Icon(imageVector = Icons.Default.KeyboardArrowLeft, contentDescription = "Previous Month", tint = AccentCyan)
            }
            Text(
                text = monthFormat.format(calendarMonthDate),
                color = TextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
            IconButton(onClick = { viewModel.nextMonth() }) {
                Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = "Next Month", tint = AccentCyan)
            }
        }

        // Days of week header labels
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            val daysOfWeek = listOf("Su", "Mo", "Tu", "We", "Th", "Fr", "Sa")
            daysOfWeek.forEach { day ->
                Text(
                    text = day,
                    color = TextSecondary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Month Grid Layout
        Card(
            colors = CardDefaults.cardColors(containerColor = SurfaceBg),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, BorderColor, RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(8.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                weeks.forEach { week ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        val paddedWeek = week.toMutableList()
                        while (paddedWeek.size < 7) {
                            paddedWeek.add(null)
                        }

                        paddedWeek.forEach { day ->
                            if (day == null) {
                                Spacer(modifier = Modifier.weight(1f))
                            } else {
                                val dateStr = cellDateFormat.format(day)
                                val isSelected = dateStr == selectedCalendarDay
                                val isToday = dateStr == todayString
                                val hasFollowUps = calendarFollowUpDates.contains(dateStr)
                                val dayNum = dayNumberFormat.format(day)

                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .aspectRatio(1f)
                                        .padding(2.dp)
                                        .background(
                                            color = if (isSelected) AccentCyan else Color.Transparent,
                                            shape = RoundedCornerShape(8.dp)
                                        )
                                        .border(
                                            width = if (isToday && !isSelected) 1.dp else 0.dp,
                                            color = if (isToday && !isSelected) AccentTeal else Color.Transparent,
                                            shape = RoundedCornerShape(8.dp)
                                        )
                                        .clickable { viewModel.selectCalendarDay(dateStr) },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.Center
                                    ) {
                                        Text(
                                            text = dayNum,
                                            color = if (isSelected) Color.Black else TextPrimary,
                                            fontSize = 13.sp,
                                            fontWeight = if (isSelected || isToday) FontWeight.Bold else FontWeight.Normal
                                        )
                                        if (hasFollowUps) {
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Box(
                                                modifier = Modifier
                                                    .size(4.dp)
                                                    .background(
                                                        color = if (isSelected) Color.Black else AccentCyan,
                                                        shape = androidx.compose.foundation.shape.CircleShape
                                                    )
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Selected Day Title
        Text(
            text = "Follow-ups for ${
                if (selectedCalendarDay == todayString) "Today"
                else {
                    try {
                        val parsed = cellDateFormat.parse(selectedCalendarDay)
                        SimpleDateFormat("d MMM yyyy", Locale.getDefault()).format(parsed!!)
                    } catch (e: Exception) {
                        selectedCalendarDay
                    }
                }
            }",
            color = TextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            modifier = Modifier.padding(top = 8.dp)
        )

        // Leads list scheduled for the selected day
        if (selectedDayFollowUps.isEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = SurfaceBg),
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No follow-ups scheduled for this day.",
                        color = TextSecondary,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(selectedDayFollowUps, key = { it.id }) { vendor ->
                    VendorItemCard(
                        vendor = vendor,
                        onCallLogClick = { viewModel.showCallLogDialog(vendor) },
                        onCardClick = { onVendorClick(vendor) }
                    )
                }
            }
        }
    }
}
