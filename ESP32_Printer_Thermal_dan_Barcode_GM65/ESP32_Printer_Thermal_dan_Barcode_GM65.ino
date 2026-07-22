#include <WiFi.h>
#include <BlynkSimpleEsp32.h>
#include <HX711.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ======================================================
// BLYNK CONFIGURATION
// ======================================================
#define BLYNK_TEMPLATE_ID   "YOUR_TEMPLATE_ID"
#define BLYNK_TEMPLATE_NAME "YOUR_TEMPLATE_NAME"
#define BLYNK_AUTH_TOKEN    "YOUR_BLYNK_AUTH_TOKEN"

// ======================================================
// WIFI CONFIGURATION
// ======================================================
char ssid[] = "YOUR_WIFI_SSID";
char pass[] = "YOUR_WIFI_PASSWORD";

// ======================================================
// PIN CONFIGURATION
// ======================================================
#define DT_PIN    4
#define SCK_PIN   5

#define RELAY1    26      // Starter Motor
#define RELAY2    27      // Motor Pengisian

// ======================================================
// OBJECT
// ======================================================
HX711 scale;
LiquidCrystal_I2C lcd(0x27, 16, 2);
BlynkTimer timer;

// ======================================================
// GLOBAL VARIABLE
// ======================================================
float calibration_factor = 420.0;

float targetGram = 0;
float berat = 0;

bool mesinJalan = false;
bool prosesSelesai = false;
bool starterON = false;

// ======================================================
// MOTOR PENGISIAN
// ======================================================
void motorON()
{
    digitalWrite(RELAY2, LOW);
    Serial.println("Motor Pengisian ON");
}

void motorOFF()
{
    digitalWrite(RELAY2, HIGH);
    Serial.println("Motor Pengisian OFF");
}

// ======================================================
// STARTER MOTOR
// ======================================================
void starterONFunc()
{
    digitalWrite(RELAY1, LOW);
    starterON = true;

    Serial.println("Starter ON");
}

void starterOFFFunc()
{
    digitalWrite(RELAY1, HIGH);
    starterON = false;

    Serial.println("Starter OFF");
}

// ======================================================
// INPUT TARGET BERAT
// ======================================================
BLYNK_WRITE(V0)
{
    targetGram = param.asFloat();

    Serial.print("Target Gram : ");
    Serial.println(targetGram);
}

// ======================================================
// START / STOP MOTOR
// ======================================================
BLYNK_WRITE(V2)
{
    int val = param.asInt();

    Serial.print("V2 Start : ");
    Serial.println(val);

    if (val == 1 && targetGram > 0)
    {
        mesinJalan = true;
        prosesSelesai = false;

        motorON();
    }
    else
    {
        mesinJalan = false;
        motorOFF();
    }
}

// ======================================================
// STARTER MANUAL
// ======================================================
BLYNK_WRITE(V3)
{
    int val = param.asInt();

    if (val == 1)
    {
        starterONFunc();
    }
    else
    {
        starterOFFFunc();
    }
}

// ======================================================
// RESET SISTEM
// ======================================================
BLYNK_WRITE(V7)
{
    if (param.asInt() == 1)
    {
        Serial.println("RESET SISTEM");

        motorOFF();
        starterOFFFunc();

        targetGram = 0;
        berat = 0;
        mesinJalan = false;
        prosesSelesai = false;

        scale.tare();

        Blynk.virtualWrite(V0, 0);
        Blynk.virtualWrite(V1, 0);
        Blynk.virtualWrite(V2, 0);
        Blynk.virtualWrite(V3, 0);
        Blynk.virtualWrite(V4, 0);
        Blynk.virtualWrite(V5, 0);
        Blynk.virtualWrite(V6, 0);

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("SYSTEM RESET");

        lcd.setCursor(0, 1);
        lcd.print("SIAP LAGI");

        delay(1000);

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Sistem Siap");

        Blynk.virtualWrite(V7, 0);

        Serial.println("Reset Selesai");
    }
}

// ======================================================
// KIRIM DATA KE BLYNK
// ======================================================
void kirimData()
{
    // Membaca Loadcell
    if (scale.is_ready())
    {
        berat = scale.get_units(5);

        if (berat < 0)
        {
            berat = 0;
        }
    }

    Serial.print("Berat : ");
    Serial.print(berat);
    Serial.println(" gram");

    Blynk.virtualWrite(V1, berat);

    // Hitung Progress
    float progress = 0;

    if (targetGram > 0)
    {
        progress = (berat / targetGram) * 100.0;

        if (progress > 100)
        {
            progress = 100;
        }
    }

    Blynk.virtualWrite(V4, progress);
    Blynk.virtualWrite(V5, mesinJalan);
    Blynk.virtualWrite(V6, starterON);

    // Update LCD
    lcd.setCursor(0, 0);
    lcd.print("B:");
    lcd.print((int)berat);
    lcd.print("g     ");

    lcd.setCursor(0, 1);
    lcd.print("T:");
    lcd.print((int)targetGram);
    lcd.print("g     ");

    // ==========================================
    // AUTO STOP
    // ==========================================
    if (mesinJalan && targetGram > 0 && berat >= targetGram)
    {
        mesinJalan = false;
        prosesSelesai = true;

        motorOFF();

        Blynk.virtualWrite(V2, 0);

        Serial.println("TARGET TERCAPAI");
    }

    // ==========================================
    // AUTO RESET SAAT WADAH KOSONG
    // ==========================================
    if (prosesSelesai && berat < 5)
    {
        scale.tare();
        prosesSelesai = false;

        Serial.println("Siap untuk pengisian berikutnya");
    }
}

// ======================================================
// SETUP
// ======================================================
void setup()
{
    Serial.begin(115200);

    pinMode(RELAY1, OUTPUT);
    pinMode(RELAY2, OUTPUT);

    digitalWrite(RELAY1, HIGH);
    digitalWrite(RELAY2, HIGH);

    delay(1000);

    starterOFFFunc();
    motorOFF();

    // LCD
    lcd.init();
    lcd.backlight();

    lcd.setCursor(0, 0);
    lcd.print("Init Sistem");

    // Loadcell
    scale.begin(DT_PIN, SCK_PIN);
    scale.set_scale(calibration_factor);
    scale.tare();

    // WiFi
    WiFi.begin(ssid, pass);

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println();
    Serial.println("WiFi Connected");

    // Blynk
    Blynk.config(BLYNK_AUTH_TOKEN);
    Blynk.connect();

    // Timer
    timer.setInterval(1000L, kirimData);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Sistem Siap");
}

// ======================================================
// LOOP
// ======================================================
void loop()
{
    if (!Blynk.connected())
    {
        Blynk.connect();
    }

    Blynk.run();
    timer.run();
}