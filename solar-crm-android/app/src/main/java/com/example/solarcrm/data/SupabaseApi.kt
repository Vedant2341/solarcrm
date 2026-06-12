package com.example.solarcrm.data

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object SupabaseApi {
    private const val TAG = "SupabaseApi"
    private const val BASE_URL = "https://rtxcbmwxrqvfuruvqvqm.supabase.co"
    private const val API_KEY = "sb_publishable_Ls1qhgUp_DwC6P9kra0yfA_bseWv95_"

    class ApiException(message: String, val statusCode: Int) : Exception(message)

    data class Session(
        val accessToken: String,
        val userId: String,
        val email: String,
        var name: String = "",
        var role: String = "user"
    )

    private fun request(
        method: String,
        path: String,
        body: String? = null,
        authToken: String? = null,
        range: String? = null
    ): String = try {
        val url = URL("$BASE_URL$path")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = method
        conn.connectTimeout = 15000
        conn.readTimeout = 15000
        conn.doInput = true

        conn.setRequestProperty("apikey", API_KEY)
        conn.setRequestProperty("Content-Type", "application/json")
        if (authToken != null) {
            conn.setRequestProperty("Authorization", "Bearer $authToken")
        }
        if (range != null) {
            conn.setRequestProperty("Range", range)
        }

        if (body != null) {
            conn.doOutput = true
            val writer = OutputStreamWriter(conn.outputStream, "UTF-8")
            writer.write(body)
            writer.flush()
            writer.close()
        }

        val statusCode = conn.responseCode
        if (statusCode in 200..299) {
            val reader = BufferedReader(InputStreamReader(conn.inputStream, "UTF-8"))
            val response = StringBuilder()
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                response.append(line)
            }
            reader.close()
            response.toString()
        } else {
            val reader = BufferedReader(InputStreamReader(conn.errorStream ?: conn.inputStream, "UTF-8"))
            val errorResponse = StringBuilder()
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                errorResponse.append(line)
            }
            reader.close()
            Log.e(TAG, "Request failed: code=$statusCode response=$errorResponse")
            throw ApiException("HTTP $statusCode: $errorResponse", statusCode)
        }
    } catch (e: ApiException) {
        throw e
    } catch (e: Exception) {
        Log.e(TAG, "Exception in request: ${e.message}", e)
        throw e
    }

    suspend fun login(email: String, password: String): Session = withContext(Dispatchers.IO) {
        val bodyObj = JSONObject().apply {
            put("email", email)
            put("password", password)
        }
        val responseStr = request(
            method = "POST",
            path = "/auth/v1/token?grant_type=password",
            body = bodyObj.toString()
        )
        val json = JSONObject(responseStr)
        val accessToken = json.getString("access_token")
        val userJson = json.getJSONObject("user")
        val userId = userJson.getString("id")
        val userEmail = userJson.getString("email")

        val session = Session(
            accessToken = accessToken,
            userId = userId,
            email = userEmail
        )

        // Resolve profile role and name
        try {
            val profileStr = request(
                method = "GET",
                path = "/rest/v1/profiles?id=eq.$userId&select=*",
                authToken = accessToken
            )
            val profileArray = JSONArray(profileStr)
            if (profileArray.length() > 0) {
                val p = profileArray.getJSONObject(0)
                session.name = p.optString("name", userEmail.substringBefore("@"))
                session.role = p.optString("role", "user")
            } else {
                session.name = userEmail.substringBefore("@")
                session.role = if (userEmail.lowercase() == "vedant@vijapur.in") "admin" else "user"
                // Auto upsert profile if missing
                val newProfile = JSONObject().apply {
                    put("id", userId)
                    put("email", userEmail)
                    put("name", session.name)
                    put("role", session.role)
                }
                request(
                    method = "POST",
                    path = "/rest/v1/profiles",
                    body = newProfile.toString(),
                    authToken = accessToken
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error resolving profile", e)
            session.name = userEmail.substringBefore("@")
            session.role = if (userEmail.lowercase() == "vedant@vijapur.in") "admin" else "user"
        }
        session
    }

    suspend fun fetchProfiles(token: String): JSONArray = withContext(Dispatchers.IO) {
        val response = request(
            method = "GET",
            path = "/rest/v1/profiles?select=*",
            authToken = token
        )
        JSONArray(response)
    }

    suspend fun fetchCallLogs(token: String): JSONArray = withContext(Dispatchers.IO) {
        val response = request(
            method = "GET",
            path = "/rest/v1/call_logs?select=*&order=timestamp.desc",
            authToken = token
        )
        JSONArray(response)
    }

    suspend fun fetchVendors(token: String): JSONArray = withContext(Dispatchers.IO) {
        val allVendors = JSONArray()
        var offset = 0
        val pageSize = 1000
        var hasMore = true

        while (hasMore) {
            val rangeHeader = "$offset-${offset + pageSize - 1}"
            val responseStr = request(
                method = "GET",
                path = "/rest/v1/vendors?select=*&order=id.asc",
                authToken = token,
                range = rangeHeader
            )
            val pageArray = JSONArray(responseStr)
            for (i in 0 until pageArray.length()) {
                allVendors.put(pageArray.get(i))
            }
            if (pageArray.length() < pageSize) {
                hasMore = false
            } else {
                offset += pageSize
            }
        }
        allVendors
    }

    suspend fun insertCallLog(
        token: String,
        vendorId: Int,
        outcome: String,
        note: String,
        followUpDate: String?,
        userId: String
    ): Boolean = withContext(Dispatchers.IO) {
        val bodyObj = JSONObject().apply {
            put("vendor_id", vendorId)
            put("outcome", outcome)
            put("note", note.ifBlank { "No description provided." })
            put("follow_up_date", if (followUpDate.isNullOrBlank()) JSONObject.NULL else followUpDate)
            put("user_id", userId)
        }
        try {
            request(
                method = "POST",
                path = "/rest/v1/call_logs",
                body = bodyObj.toString(),
                authToken = token
            )
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error inserting call log", e)
            false
        }
    }

    suspend fun updateVendorAssignee(
        token: String,
        vendorId: Int,
        userId: String
    ): Boolean = withContext(Dispatchers.IO) {
        val bodyObj = JSONObject().apply {
            put("assigned_to", userId)
        }
        try {
            request(
                method = "PATCH",
                path = "/rest/v1/vendors?id=eq.$vendorId",
                body = bodyObj.toString(),
                authToken = token
            )
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error updating vendor assignee", e)
            false
        }
    }
}
