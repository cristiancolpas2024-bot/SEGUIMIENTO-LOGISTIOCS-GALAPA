package com.logisticstracking.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.*
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var loadingLayout: LinearLayout
    private lateinit var statusText: TextView
    private lateinit var btnRetry: Button

    private val devServerUrl = "http://10.0.2.2:3000/"

    // Permissions handlers
    private var geolocationCallback: GeolocationPermissions.Callback? = null
    private var geolocationOrigin: String? = null
    private var permissionRequestOrigin: PermissionRequest? = null

    private val requestPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val geoGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        val cameraGranted = permissions[Manifest.permission.CAMERA] == true

        if (geoGranted && geolocationCallback != null && geolocationOrigin != null) {
            geolocationCallback?.invoke(geolocationOrigin, true, false)
        } else {
            geolocationCallback?.invoke(geolocationOrigin, false, false)
        }

        if (cameraGranted && permissionRequestOrigin != null) {
            permissionRequestOrigin?.grant(permissionRequestOrigin?.resources)
        } else {
            permissionRequestOrigin?.deny()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        loadingLayout = findViewById(R.id.loadingLayout)
        statusText = findViewById(R.id.statusText)
        btnRetry = findViewById(R.id.btnRetry)

        setupWebView()

        btnRetry.setOnClickListener {
            loadApp()
        }

        loadApp()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.settings.loadWithOverviewMode = true
        webView.settings.useWideViewPort = true
        webView.settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        webView.settings.cacheMode = WebSettings.LOAD_DEFAULT
        webView.settings.setSupportZoom(true)
        webView.settings.builtInZoomControls = true
        webView.settings.displayZoomControls = false

        // User Agent
        webView.settings.userAgentString = webView.settings.userAgentString + " LogisticTrackingAndroid"

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                loadingLayout.visibility = View.GONE
                webView.visibility = View.VISIBLE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                // If the error is for the main page
                if (request?.isForMainFrame == true) {
                    showErrorState()
                }
            }

            override fun onReceivedHttpError(
                view: WebView?,
                request: WebResourceRequest?,
                errorResponse: WebResourceResponse?
            ) {
                if (request?.isForMainFrame == true) {
                    showErrorState()
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            // Handle Geolocation permissions
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                geolocationCallback = callback
                geolocationOrigin = origin

                val hasLocationFine = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
                val hasLocationCoarse = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED

                if (hasLocationFine || hasLocationCoarse) {
                    callback?.invoke(origin, true, false)
                } else {
                    requestPermissionsLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        )
                    )
                }
            }

            // Handle Camera permissions for newer API
            override fun onPermissionRequest(request: PermissionRequest?) {
                permissionRequestOrigin = request
                val resources = request?.resources ?: return

                var needsCamera = false
                for (resource in resources) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE == resource) {
                        needsCamera = true
                        break
                    }
                }

                if (needsCamera) {
                    val hasCamera = ContextCompat.checkSelfPermission(
                        this@MainActivity,
                        Manifest.permission.CAMERA
                    ) == PackageManager.PERMISSION_GRANTED

                    if (hasCamera) {
                        request.grant(resources)
                    } else {
                        requestPermissionsLauncher.launch(arrayOf(Manifest.permission.CAMERA))
                    }
                } else {
                    request.grant(resources)
                }
            }
        }
    }

    private fun loadApp() {
        statusText.text = "Conectando al servidor local..."
        btnRetry.visibility = View.GONE
        loadingLayout.visibility = View.VISIBLE
        webView.visibility = View.GONE
        webView.loadUrl(devServerUrl)
    }

    private fun showErrorState() {
        statusText.text = "Error al conectar al panel vehicular.\n¿Está encendido el servidor?"
        btnRetry.visibility = View.VISIBLE
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
