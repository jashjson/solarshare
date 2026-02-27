require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const axios   = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const FEATHERLESS_URL = "https://api.featherless.ai/v1/chat/completions";
const MODEL           = "meta-llama/Meta-Llama-3.1-8B-Instruct";

//function getSeason() {
//    const month = new Date().getMonth() + 1;
//   if (month >= 3 && month <= 5)  return "summer";
//  if (month >= 6 && month <= 9)  return "monsoon";
//if (month >= 10 && month <= 11) return "post-monsoon";
//  return "winter";
//}
function getSeason() {
    const seasons = ["summer", "monsoon", "post-monsoon", "winter"];
    return seasons[Math.floor(Math.random() * seasons.length)];
}
app.post("/api/get-price", async (req, res) => {
    const { units_available, units_requested, govt_rate, total_listings } = req.body;

    const season = getSeason();
    const hour   = new Date().getHours();

    const conditions = {
        temperature : Math.floor(Math.random() * (42 - 18 + 1)) + 18,
        weather     : ["Sunny", "Cloudy", "Partly Cloudy", "Rainy"][Math.floor(Math.random() * 4)],
        humidity    : Math.floor(Math.random() * (90 - 30 + 1)) + 30,
        grid_load   : ["Low", "Moderate", "High", "Critical"][Math.floor(Math.random() * 4)],
        wind_speed  : Math.floor(Math.random() * 31)
    };

    const prompt = `
    You are an energy pricing engine for a peer to peer solar energy marketplace in India.

    Current conditions:
    - Season       : ${season}
    - Hour         : ${hour}:00
    - Temperature  : ${conditions.temperature}°C
    - Weather      : ${conditions.weather}
    - Humidity     : ${conditions.humidity}%
    - Grid Load    : ${conditions.grid_load}
    - Wind Speed   : ${conditions.wind_speed} km/h
    - Units available : ${units_available}
    - Units requested : ${units_requested}
    - Government rate : Rs${govt_rate} per unit
    - Total listings  : ${total_listings}

    Rules:
    - Price MUST be lower than Rs${govt_rate}
    - Price MUST be higher than Rs0
    - Higher price when: summer, high temperature, critical grid load, rainy/cloudy weather, evening peak (6pm-10pm)
    - Lower price when: monsoon, mild temperature, low grid load, sunny weather, many listings

    Respond ONLY in this exact JSON format:
    {"price": 0.00, "reason": "one line explanation"}
    `;

    try {
        const response = await axios.post(
            FEATHERLESS_URL,
            {
                model      : MODEL,
                messages   : [
                    { role: "system", content: "You are an energy pricing engine. Respond in JSON only. Never include any text outside the JSON." },
                    { role: "user",   content: prompt }
                ],
                max_tokens  : 150,
                temperature : 0.3
            },
            {
                headers: {
                    "Authorization" : `Bearer ${process.env.FEATHERLESS_API_KEY}`,
                    "Content-Type"  : "application/json"
                }
            }
        );

        let raw = response.data.choices[0].message.content.trim();
        raw = raw.replace(/```json|```/g, "").trim();
        const result = JSON.parse(raw);

        res.json({
            price      : result.price,
            reason     : result.reason,
            season,
            hour,
            conditions
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Pricing failed" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));