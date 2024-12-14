import React, { useState, useEffect } from "react";
import "../styles/WeatherWidget.css";
// Replace with your OpenWeatherMap API key
const API_KEY = "7b09e8b47192c09be994da68d297509e";

const WeatherWidget = () => {
  const [city, setCity] = useState("Islamabad"); // Default city
  const [temperature, setTemperature] = useState(12);
  const [localTime, setLocalTime] = useState(new Date());

  useEffect(() => {
    fetchWeatherData(city);
    const timer = setInterval(() => updateLocalTime(), 1000);
    return () => clearInterval(timer);
  }, [city]);

  const fetchWeatherData = async (cityName) => {
    try {
      const response = await fetch(
        `api.openweathermap.org/data/2.5/forecast?lat=44.34&lon=10.99&appid=${API_KEY}`
      );
      console.log(response)
      if (!response.ok) throw new Error("City not found");
      const data = await response.json();

      const temp = data.main.temp;
      const sunrise = new Date(data.sys.sunrise * 1000);
      const sunset = new Date(data.sys.sunset * 1000);
      const currentTime = new Date(data.dt * 1000);

      setTemperature(temp);
      setLocalTime(currentTime);
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };

  const determineTimeOfDay = (currentTime, sunrise, sunset) => {
    if (currentTime >= sunrise && currentTime < sunset) {
      const hours = currentTime.getHours();
      if (hours >= 12 && hours < 15) return "Noon";
      if (hours < 12) return "Day";
      return "Afternoon";
    }
    return "Night";
  };

  const updateLocalTime = () => {
    setLocalTime((prev) => new Date(prev.getTime() + 1000));
  };

  const isDaytime = (time) => {
    const hours = time.getHours();
    return hours >= 6 && hours < 18; // Daytime is between 6:00 AM and 6:00 PM
  };


  return (
    <div className="p-1">
      <div className={`weather-main  ${isDaytime(localTime) ? "" : "night"}`}>
        <h1 className="temperature">{temperature}°</h1>
        <p className="city">{city}</p>
        <p className="time">
          {localTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
        {isDaytime(localTime) ? (
          <div className="sun"></div>
        ) : (
          <div className="moon">
            <div className="moon-internal"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherWidget;
