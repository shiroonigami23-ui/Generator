package com.shiro.generatorapp

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.security.SecureRandom

class MainActivity : AppCompatActivity() {
    private val secureRandom = SecureRandom()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val lengthInput = findViewById<EditText>(R.id.lengthInput)
        val output = findViewById<TextView>(R.id.outputText)
        val generateBtn = findViewById<Button>(R.id.generateBtn)

        generateBtn.setOnClickListener {
            val length = lengthInput.text.toString().toIntOrNull()?.coerceIn(8, 128) ?: 20
            output.text = generatePassword(length)
        }
    }

    private fun generatePassword(length: Int): String {
        val charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+"
        val builder = StringBuilder(length)
        repeat(length) {
            val idx = secureRandom.nextInt(charset.length)
            builder.append(charset[idx])
        }
        return builder.toString()
    }
}
