// app.js - Arquivo para ajustes globais rápidos
console.log("Orquestracs - Sistema carregado com sucesso.");

/**
 * Busca o clima e temperatura atual baseado na localização do usuário
 * Usa a API gratuita e keyless Open-Meteo
 */
async function initWeather() {
    const weatherEl = document.getElementById('weather-widget');
    if (!weatherEl) return;

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                // Solicita dados de clima atual
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                const data = await response.json();
                
                if (data && data.current_weather) {
                    const temp = data.current_weather.temperature;
                    const code = data.current_weather.weathercode;
                    
                    // Mapeamento simples de ícones do FontAwesome baseado no WeatherCode (WMO)
                    let icon = 'fa-cloud-sun'; // Default
                    if (code === 0) icon = 'fa-sun'; // Céu limpo
                    if (code >= 1 && code <= 3) icon = 'fa-cloud-sun'; // Parcialmente nublado
                    if (code >= 45 && code <= 48) icon = 'fa-smog'; // Névoa
                    if (code >= 51 && code <= 67) icon = 'fa-cloud-rain'; // Chuvisco / Chuva leve
                    if (code >= 71 && code <= 77) icon = 'fa-snowflake'; // Neve
                    if (code >= 80 && code <= 82) icon = 'fa-cloud-showers-heavy'; // Pancadas
                    if (code >= 95) icon = 'fa-cloud-bolt'; // Trovoadas

                    weatherEl.innerHTML = `<i class="fa-solid ${icon}"></i> ${Math.round(temp)}°C`;
                    weatherEl.title = `Clima atual na sua região (WMO Code: ${code})`;
                }
            } catch (error) {
                console.error("Erro ao buscar clima:", error);
                weatherEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Erro';
            }
        }, (err) => {
            console.warn("Geolocalização não autorizada ou indisponível para exibição do clima.");
            weatherEl.style.display = 'none'; // Oculta o widget se não houver permissão
        });
    } else {
        weatherEl.style.display = 'none';
    }
}

// Inicia a busca do clima ao carregar a página
document.addEventListener('DOMContentLoaded', initWeather);
