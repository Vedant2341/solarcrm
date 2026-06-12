package com.example.solarcrm.ui.main

import com.example.solarcrm.data.AuthState
import com.example.solarcrm.data.CallLog
import com.example.solarcrm.data.DataRepository
import com.example.solarcrm.data.Profile
import com.example.solarcrm.data.Vendor
import junit.framework.TestCase.assertEquals
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Test

class MainScreenViewModelTest {
  @Test
  fun authState_initiallyLoggedOut() = runTest {
    val viewModel = MainScreenViewModel(FakeMyModelRepository())
    assertEquals(AuthState.LoggedOut, viewModel.authState.value)
  }
}

private class FakeMyModelRepository : DataRepository {
  override val authState = MutableStateFlow<AuthState>(AuthState.LoggedOut)
  override val vendors = MutableStateFlow<List<Vendor>>(emptyList())
  override val callLogs = MutableStateFlow<Map<Int, List<CallLog>>>(emptyMap())
  override val profiles = MutableStateFlow<List<Profile>>(emptyList())
  override val isLoading = MutableStateFlow(false)
  override val error = MutableStateFlow<String?>(null)

  override suspend fun login(email: String, password: String) {}
  override suspend fun logout() {}
  override suspend fun fetchData() {}
  override suspend fun logCall(vendorId: Int, outcome: String, note: String, followUpDate: String?) {}
}
