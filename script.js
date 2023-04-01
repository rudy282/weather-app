// import { Chart } from "chart.js/auto";
// import { leaflet } from "leaflet";

class Coords {
    constructor(lat, lon) {
        this.lat = lat;
        this.lon = lon;
    }
}

let APIKey = localStorage.getItem("APIKey");
let currentLocation = localStorage.getItem("currentLocation");
let startingLocation = localStorage.getItem("startingLocation");
let firstVisit = false;

let coordinates = new Coords(0, 0);
let citiesDOM = [];
let cities = [];

const map = L.map('map');
let marker = L.marker([coordinates.lat, coordinates.lon]).addTo(map);

window.onload = function () {
    checkFirstVisit();
    if (!firstVisit) {
        showLoadingScreen();
        let citiesLoaded = JSON.parse(localStorage.getItem("places"));
        if (citiesLoaded != null)
            for (const i of citiesLoaded)
                addNewPlaceToTheList(i);
        if (currentLocation == "true" || currentLocation == null)
            getCurrentLocation(coordinates);
        else
            getGeoCoords(startingLocation);
        createMap(map);
    } else {
        event.preventDefault();
        showSettingsMenu();
    }
}

const search_button = document.querySelector("#search-button");
search_button.addEventListener("click", () => {
    const search = document.querySelector("#search");
    let searchValue = search.value;
    if (searchValue != null) getGeoCoords(searchValue);
    search.value = "";
    event.preventDefault();
});

const list_element_current_location = document.querySelector("#list-element-current-location");
list_element_current_location.addEventListener("click", () => { getCurrentLocation(coordinates); });

const add_button = document.querySelector("#add-button");
add_button.addEventListener("click", () => {
    const search = document.querySelector("#search");
    let searchValue = search.value;
    search.value = "";
    addNewPlaceToTheList(searchValue);
});

const footer_button = document.querySelector("#footer-button");
footer_button.addEventListener("click", () => { showSettingsMenu(); });

function addNewPlaceToTheList(searchValue) {
    event.preventDefault();
    if (searchValue == null || searchValue == "") {
        showPopup("You cannot add empty place, please write something");
        return 0;
    }
    for (const i in cities) {
        if (cities[i] == searchValue) {
            showPopup("This place has been already added, please change it.");
            return 0;
        }
    }

    const city_list = document.getElementById("city-list");
    let newValue = document.createElement("div");
    newValue.className = "list-element";
    newValue.id = `list-element-${searchValue}`;
    newValue.innerHTML = `<span>${searchValue}</span><i class="fa-solid fa-circle-xmark"></i>`;
    newValue.firstChild.addEventListener("click", () => { getGeoCoords(searchValue); });
    newValue.lastChild.addEventListener("click", function () {
        this.parentNode.remove(this);
        for (const i of cities) {
            if (i == String(this.parentNode.id).slice(13)) {
                cities.splice(cities.indexOf(i), 1);
                citiesDOM.splice(citiesDOM.indexOf(1), 1);
                localStorage.setItem("places", JSON.stringify(cities));

            }
        }
    });
    city_list.appendChild(newValue);
    citiesDOM.push(newValue);
    cities.push(searchValue);
    localStorage.setItem("places", JSON.stringify(cities));
}

function showPopup(msg) {
    hideLoadingScreen();
    const popup = document.querySelector("#popup");
    const popup_message = document.querySelector("#popup-message");
    const popup_button = document.querySelector("#popup-button");

    popup.style.display = "flex";
    popup_message.innerHTML = msg;
    popup_button.addEventListener("click", () => { popup.style.display = "none"; });
}

function getCurrentLocation(coords) {
    showLoadingScreen();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                coords.lat = position.coords.latitude;
                coords.lon = position.coords.longitude;
                getWeatherForecastData(coords);
            }
        );
    }
}

function changeCity(data, coords) {
    coords.lat = data[0].lat;
    coords.lon = data[0].lon;

    getWeatherForecastData(coords);
}

function getWeatherForecastData(coords) {
    showLoadingScreen();
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${APIKey}&units=metric`)
        .then(response => response.json())
        .then(response => changeData(response))
        .catch(error => { showPopup("Sorry, we cannot connect to the server, you have connectivity issues."); console.error(error); });
}

function getGeoCoords(searchQuery) {
    showLoadingScreen();
    fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchQuery}&appid=${APIKey}`)
        .then(response => response.json())
        .then(response => changeCity(response, coordinates))
        .catch((error) => { showPopup("Sorry, we couldn't find this place, please change it."); console.error(error) })
        .catch(() => { return false; });
}

function changeData(data) {
    changeWeatherInfo(data);
    changeWeatherForecastInfo(data);
    try { updateChart(data, false) } catch (error) { console.error("There is a problem with chart.js CDNs"); }
    updateWeatherMap(map);
    changeWeatherVideo(data);
    changeAdditionalWeatherInfo(data);
    hideLoadingScreen();
}

function changeWeatherInfo(data) {
    const city_data = document.querySelector("#city-data");
    const degrees_data = document.querySelector("#degrees-data");
    const weather_type_data = document.querySelector("#weather-type-data");
    const wind_data = document.querySelector("#wind-data");
    const humidity_data = document.querySelector("#humidity-data");
    const weather_image = document.querySelector("#weather-image");
    const precipitation_data = document.querySelector("#precipitation-data");

    const weather = document.querySelector("#weather");

    if (window.width > 950) {
        if (Math.round(data.list[0].main.temp) < -9 || data.city.name.length > 20) weather.style.width = "355px";
        else weather.style.width = "315px";
    }

    city_data.innerHTML = data.city.name;
    degrees_data.innerHTML = Math.round(data.list[0].main.temp);
    weather_type_data.innerHTML = data.list[0].weather[0].description;
    wind_data.innerHTML = Math.round(data.list[0].wind.speed * 3.6);
    humidity_data.innerHTML = data.list[0].main.humidity;
    precipitation_data.innerHTML = Math.round(data.list[0].pop * 100);
    let weatherConditionCode = data.list[0].weather[0].icon;
    weather_image.src = `https://openweathermap.org/img/wn/${weatherConditionCode}@2x.png`;

}

function epochToJsDate(ts) {
    // ts = epoch timestamp
    // returns date obj
    return new Date(ts * 1000);
}

function changeWeatherForecastInfo(data) {
    const HOUR = 12;
    let datesArrIndexes = new Array;
    for (let i = 0; i < data.list.length; i++) {
        let date = epochToJsDate(data.list[i].dt)
        if (date.getUTCHours() == HOUR) datesArrIndexes.push(i);
    }

    for (let i = 1; i < 6; i++) {
        let forecastWeatherIcon = data.list[datesArrIndexes[i - 1]].weather[0].icon;
        document.querySelector("#forecast-day-img-" + i).src = `https://openweathermap.org/img/wn/${forecastWeatherIcon}.png`;
        document.querySelector("#forecast-day-degree-data-" + i).innerHTML = Math.round(data.list[datesArrIndexes[i - 1]].main.temp) + "&#176;C";
        document.querySelector('#forecast-day-degree-weekday-' + i).innerHTML = epochToJsDate(data.list[datesArrIndexes[i - 1]].dt).toLocaleDateString('us', { weekday: 'long' });
    }

    try {
        const precipitation_chart_button = document.querySelector("#precipitation-chart-button");
        precipitation_chart_button.addEventListener("click", () => updateChart(data, true));
        const temperature_chart_button = document.querySelector("#temperature-chart-button");
        temperature_chart_button.addEventListener("click", () => { updateChart(data, false); });
    } catch (error) { console.error("There is a CDN error") };

}

function changeChartData(data, isPrecipitation) {
    const weatherDataPrecipitation = {};
    const weatherDataTemperature = {};
    const DATA_LENGTH = 9;

    for (let i = 0; i < DATA_LENGTH; i++) {
        if (i < 8) {
            weatherDataPrecipitation[epochToJsDate(data.list[i].dt).getHours() - 1 + ':00'] = data.list[i].pop * 100;
            weatherDataTemperature[epochToJsDate(data.list[i].dt).getHours() - 1 + ':00'] = Math.round(data.list[i].main.temp);
        }
        else {
            weatherDataPrecipitation[epochToJsDate(data.list[i].dt).getHours() - 1 + ':00 next day'] = data.list[i].pop;
            weatherDataTemperature[epochToJsDate(data.list[i].dt).getHours() - 1 + ':00 next day'] = Math.round(data.list[i].main.temp);
        }
    }

    if (isPrecipitation) return weatherDataPrecipitation;
    else return weatherDataTemperature;
}

function updateChart(data, isPrecipitation) {
    const weatherGraphData = changeChartData(data, isPrecipitation);

    let label, color;

    if (isPrecipitation) {
        label = "Precipitation";
        color = "#00afff";
    }
    else {
        label = "Temperature";
        color = "#ffa000";
    }

    const tmpChart = Chart.getChart('chart-canvas');
    if (tmpChart) tmpChart.destroy();

    const chart_canvas = document.querySelector('#chart-canvas').getContext('2d');
    const graph = new Chart(chart_canvas, {
        type: 'line',
        data: {
            labels: Object.keys(weatherGraphData),
            datasets: [
                {
                    label: label,
                    data: Object.values(weatherGraphData),
                },
            ],
        },
        options: {
            maintainAspectRatio: false,
            color: "#fff",
            backgroundColor: color,
            borderColor: color,
            scales: {
                x: {
                    grid: {
                        color: '#fff',
                        backgroundColor: '#fff'
                    },
                    ticks: {
                        color: '#fff'
                    }
                },
                y: {
                    grid: {
                        color: '#fff',
                        backgroundColor: '#fff',
                    },
                    ticks: {
                        color: '#fff'
                    }
                }
            }

        }
    });
}

function createMap(map) {
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

function updateWeatherMap(map) {
    map.removeLayer(marker);
    marker = L.marker([coordinates.lat, coordinates.lon]).addTo(map);
    map.setView([coordinates.lat, coordinates.lon], 5);
}

function changeWeatherVideo(data) {
    const clouds = document.querySelector("#video-clouds");
    const rain = document.querySelector("#video-rain");
    const snow = document.querySelector("#video-snow");
    const sun = document.querySelector("#video-sun");

    clouds.style.display = "none";
    rain.style.display = "none";
    snow.style.display = "none";
    sun.style.display = "none";

    switch (data.list[0].weather[0].main) {
        case "Thunderstorm": rain.style.display = "flex"; break;
        case "Drizzle": rain.style.display = "flex"; break;
        case "Rain": rain.style.display = "flex"; break;
        case "Snow": snow.style.display = "flex"; break;
        case "Clear": sun.style.display = "flex"; break;
        case "Clouds": clouds.style.display = "flex"; break;
        default: sun.style.display = "flex";
    }
}

function showSettingsMenu() {
    const settings_menu = document.querySelector("#settings-menu");
    settings_menu.style.display = "flex";

    window.scrollTo(0, 0);

    const settings_menu_api = document.querySelector("#settings-menu-api");
    settings_menu_api.value = APIKey;

    const settings_menu_current_location = document.querySelector("#settings-menu-current-location");
    settings_menu_current_location.value = currentLocation;

    const settings_menu_starting_location = document.querySelector("#settings-menu-starting-location");
    settings_menu_starting_location.value = startingLocation;

    const settings_menu_close = document.querySelector("#settings-menu-close");
    settings_menu_close.addEventListener("click", () => {
        APIKey = settings_menu_api.value;
        localStorage.setItem("APIKey", APIKey);

        currentLocation = settings_menu_current_location.checked;
        localStorage.setItem("currentLocation", currentLocation);

        startingLocation = settings_menu_starting_location.value;
        localStorage.setItem("startingLocation", startingLocation);

        settings_menu.style.display = "none";
        window.location.reload();
    });
}

function showLoadingScreen() {
    const body = document.querySelector("body");
    const load = document.querySelector("#load");
    load.style.display = "flex";
    body.style.overflow = "hidden";
}

function hideLoadingScreen() {
    const load = document.querySelector("#load");
    const body = document.querySelector("body");
    load.style.display = "none";
    body.style.overflow = "auto";
}

function changeAdditionalWeatherInfo(data) {
    const additional_info_feels_like = document.querySelector("#additional-info-feels-like");
    const additional_info_pressure = document.querySelector("#additional-info-pressure");
    const additional_info_clouds = document.querySelector("#additional-info-clouds");

    const additional_info_visibility = document.querySelector("#additional-info-visibility");
    const additional_info_sunrise = document.querySelector("#additional-info-sunrise");
    const additional_info_sunset = document.querySelector("#additional-info-sunset");

    additional_info_feels_like.innerHTML = Math.round(data.list[0].main.feels_like);
    additional_info_pressure.innerHTML = data.list[0].main.pressure;
    additional_info_clouds.innerHTML = data.list[0].clouds.all;

    let visibility = data.list[0].visibility;
    if (Number(visibility) > 1000) {
        visibility /= 1000;
        visibility = Math.round(visibility * 10) / 10;
        additional_info_visibility.innerHTML = visibility + "km";
    } else additional_info_visibility.innerHTML = visibility + "m";

    let sunrise = epochToJsDate(data.city.sunrise);
    if (sunrise.getHours() < 10) additional_info_sunrise.innerHTML = "0" + sunrise.getHours() + ":" + sunrise.getMinutes();
    else additional_info_sunrise.innerHTML = sunrise.getHours() + ":" + sunrise.getMinutes();

    let sunset = epochToJsDate(data.city.sunset);
    if (sunset.getHours() < 10) additional_info_sunset.innerHTML = "0" + sunset.getHours() + ":" + sunset.getMinutes();
    else additional_info_sunset.innerHTML = sunset.getHours() + ":" + sunset.getMinutes();
}

function checkFirstVisit() {
    if (localStorage.getItem('wasVisited')) {
        return;
    }
    firstVisit = true;
    localStorage.setItem('wasVisited', true);
}