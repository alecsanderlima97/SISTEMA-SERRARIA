(function() {
    const WEATHER_CACHE_KEY = 'orquestra_weather_cache_v1';
    const WEATHER_LOCATION_KEY = 'orquestra_weather_location_v1';
    const CACHE_MAX_AGE = 15 * 60 * 1000;
    const AUTO_REFRESH_MS = 30 * 60 * 1000;
    const LOCAL_PADRAO = {
        latitude: -24.220833,
        longitude: -48.765833,
        nome: 'Ribeirão Branco'
    };

    let carregando = false;
    let localAtual = lerLocalPreferido();

    function lerJsonLocal(chave) {
        try {
            return JSON.parse(localStorage.getItem(chave) || 'null');
        } catch {
            return null;
        }
    }

    function lerLocalPreferido() {
        const salvo = lerJsonLocal(WEATHER_LOCATION_KEY);
        if (!salvo || !Number.isFinite(Number(salvo.latitude)) || !Number.isFinite(Number(salvo.longitude))) {
            return { ...LOCAL_PADRAO };
        }
        return {
            latitude: Number(salvo.latitude),
            longitude: Number(salvo.longitude),
            nome: salvo.nome || 'Local atual'
        };
    }

    function climaPorCodigo(codigo) {
        const code = Number(codigo);
        if (code === 0) return { label: 'Céu limpo', icon: 'fa-sun' };
        if ([1, 2].includes(code)) return { label: 'Parcialmente nublado', icon: 'fa-cloud-sun' };
        if (code === 3) return { label: 'Nublado', icon: 'fa-cloud' };
        if ([45, 48].includes(code)) return { label: 'Neblina', icon: 'fa-smog' };
        if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Garoa', icon: 'fa-cloud-rain' };
        if ([61, 63, 65, 66, 67].includes(code)) return { label: 'Chuva', icon: 'fa-cloud-showers-heavy' };
        if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Precipitação gelada', icon: 'fa-snowflake' };
        if ([80, 81, 82].includes(code)) return { label: 'Pancadas de chuva', icon: 'fa-cloud-showers-heavy' };
        if ([95, 96, 99].includes(code)) return { label: 'Tempestade', icon: 'fa-cloud-bolt' };
        return { label: 'Condição variável', icon: 'fa-cloud-sun' };
    }

    function numero(valor, padrao = 0) {
        const n = Number(valor);
        return Number.isFinite(n) ? n : padrao;
    }

    function probabilidadeProximasHoras(dados, quantidade = 6) {
        const horas = dados?.hourly?.time || [];
        const probabilidades = dados?.hourly?.precipitation_probability || [];
        const referencia = String(dados?.current?.time || '');
        let indice = horas.findIndex(hora => hora === referencia);
        if (indice < 0) indice = horas.findIndex(hora => hora >= referencia);
        if (indice < 0) indice = 0;
        return Math.max(0, ...probabilidades.slice(indice, indice + quantidade).map(valor => numero(valor)));
    }

    function textoOperacional(chuva, precipitacao) {
        if (chuva >= 80 || precipitacao >= 10) return 'Alto risco de chuva. Reavalie carregamentos, estrada e trabalho externo.';
        if (chuva >= 55 || precipitacao >= 5) return 'Há chance relevante de chuva. Planeje proteção de materiais e acessos.';
        if (chuva >= 30 || precipitacao > 0) return 'Possibilidade moderada de chuva. Acompanhe antes das atividades externas.';
        return 'Baixo risco de chuva nas próximas horas para a operação.';
    }

    function nivelChuva(chuva) {
        if (chuva >= 70) return 'high';
        if (chuva >= 35) return 'medium';
        return 'low';
    }

    function formatarAtualizacao(timestamp) {
        return `Atualizado às ${new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    function renderizar(dados, meta = {}) {
        if (!dados?.current) return;
        const condicao = climaPorCodigo(dados.current.weather_code);
        const temperatura = Math.round(numero(dados.current.temperature_2m));
        const chuva6h = probabilidadeProximasHoras(dados);
        const chuvaHoje = numero(dados?.daily?.precipitation_probability_max?.[0]);
        const precipitacaoHoje = numero(dados?.daily?.precipitation_sum?.[0]);
        const chuvaReferencia = Math.max(chuva6h, chuvaHoje);
        const widget = document.getElementById('headerWeatherWidget');
        const iconHeader = document.getElementById('headerWeatherIcon');
        const iconAtual = document.getElementById('weatherCurrentIcon');
        if (!widget || !iconHeader || !iconAtual) return;

        widget.dataset.rain = nivelChuva(chuvaReferencia);
        iconHeader.className = `fa-solid ${condicao.icon}`;
        iconAtual.className = `fa-solid ${condicao.icon}`;
        document.getElementById('headerWeatherTemp').textContent = `${temperatura}°`;
        document.getElementById('headerWeatherRain').textContent = `Chuva 6h: ${chuva6h}%`;
        document.getElementById('weatherLocationName').textContent = localAtual.nome;
        document.getElementById('weatherUpdatedAt').textContent = formatarAtualizacao(meta.atualizadoEm || Date.now());
        document.getElementById('weatherCurrentTemp').textContent = `${temperatura}°C`;
        document.getElementById('weatherCurrentLabel').textContent = `${condicao.label} | Sensação ${Math.round(numero(dados.current.apparent_temperature, temperatura))}°C`;
        document.getElementById('weatherRainNext').textContent = `${chuva6h}%`;
        document.getElementById('weatherOperationalNote').textContent = textoOperacional(chuvaReferencia, precipitacaoHoje);
        renderizarDias(dados);
    }

    function renderizarDias(dados) {
        const painel = document.getElementById('weatherDays');
        if (!painel) return;
        const dias = dados?.daily?.time || [];
        painel.innerHTML = dias.slice(0, 4).map((data, indice) => {
            const condicao = climaPorCodigo(dados.daily.weather_code?.[indice]);
            const nomeDia = indice === 0
                ? 'Hoje'
                : new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
            const maxima = Math.round(numero(dados.daily.temperature_2m_max?.[indice]));
            const minima = Math.round(numero(dados.daily.temperature_2m_min?.[indice]));
            const chuva = Math.round(numero(dados.daily.precipitation_probability_max?.[indice]));
            return `<article title="${condicao.label}">
                <strong>${nomeDia}</strong>
                <i class="fa-solid ${condicao.icon}"></i>
                <span>${maxima}° <small>${minima}°</small></span>
                <em><i class="fa-solid fa-droplet"></i> ${chuva}%</em>
            </article>`;
        }).join('');
    }

    function urlPrevisao(local) {
        const params = new URLSearchParams({
            latitude: String(local.latitude),
            longitude: String(local.longitude),
            current: 'temperature_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m',
            hourly: 'precipitation_probability,temperature_2m,weather_code',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
            timezone: 'America/Sao_Paulo',
            forecast_days: '4'
        });
        return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    }

    function cacheCompativel(cache) {
        return cache?.dados
            && Math.abs(numero(cache.latitude) - localAtual.latitude) < 0.001
            && Math.abs(numero(cache.longitude) - localAtual.longitude) < 0.001;
    }

    async function carregarPrevisao(forcar = false) {
        if (carregando) return;
        const cache = lerJsonLocal(WEATHER_CACHE_KEY);
        if (cacheCompativel(cache)) renderizar(cache.dados, cache);
        if (!forcar && cacheCompativel(cache) && Date.now() - numero(cache.atualizadoEm) < CACHE_MAX_AGE) return;

        carregando = true;
        const widget = document.getElementById('headerWeatherWidget');
        widget?.classList.add('is-loading');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
            const resposta = await fetch(urlPrevisao(localAtual), { cache: 'no-store', signal: controller.signal });
            if (!resposta.ok) throw new Error(`Previsão indisponível (${resposta.status})`);
            const dados = await resposta.json();
            const novoCache = {
                dados,
                latitude: localAtual.latitude,
                longitude: localAtual.longitude,
                atualizadoEm: Date.now()
            };
            localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(novoCache));
            renderizar(dados, novoCache);
        } catch (error) {
            console.warn('Clima: não foi possível atualizar a previsão.', error);
            if (!cacheCompativel(cache)) {
                document.getElementById('headerWeatherRain').textContent = 'Previsão indisponível';
                document.getElementById('weatherUpdatedAt').textContent = 'Não foi possível consultar agora.';
                document.getElementById('weatherOperationalNote').textContent = 'Verifique a internet e tente atualizar a previsão.';
            }
        } finally {
            clearTimeout(timeout);
            carregando = false;
            widget?.classList.remove('is-loading');
        }
    }

    function alternarPopover(forcarEstado) {
        const popover = document.getElementById('headerWeatherPopover');
        const botao = document.getElementById('btnHeaderWeather');
        if (!popover || !botao) return;
        const abrir = typeof forcarEstado === 'boolean' ? forcarEstado : popover.hidden;
        popover.hidden = !abrir;
        botao.setAttribute('aria-expanded', String(abrir));
    }

    function usarLocalizacaoAtual() {
        if (!navigator.geolocation) {
            document.getElementById('weatherOperationalNote').textContent = 'Este aparelho não oferece localização.';
            return;
        }
        const nota = document.getElementById('weatherOperationalNote');
        nota.textContent = 'Obtendo a localização deste aparelho...';
        navigator.geolocation.getCurrentPosition(position => {
            localAtual = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                nome: 'Local atual'
            };
            localStorage.setItem(WEATHER_LOCATION_KEY, JSON.stringify(localAtual));
            carregarPrevisao(true);
        }, () => {
            nota.textContent = 'Localização não autorizada. Mantendo Ribeirão Branco.';
        }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 15 * 60 * 1000 });
    }

    function usarLocalPadrao() {
        localAtual = { ...LOCAL_PADRAO };
        localStorage.removeItem(WEATHER_LOCATION_KEY);
        carregarPrevisao(true);
    }

    function iniciar() {
        const botao = document.getElementById('btnHeaderWeather');
        if (!botao) return;
        botao.addEventListener('click', event => {
            event.stopPropagation();
            alternarPopover();
        });
        document.getElementById('headerWeatherPopover')?.addEventListener('click', event => event.stopPropagation());
        document.getElementById('btnWeatherRefresh')?.addEventListener('click', () => carregarPrevisao(true));
        document.getElementById('btnWeatherUseLocation')?.addEventListener('click', usarLocalizacaoAtual);
        document.getElementById('btnWeatherUseDefault')?.addEventListener('click', usarLocalPadrao);
        document.addEventListener('click', () => alternarPopover(false));
        carregarPrevisao();
        setInterval(() => carregarPrevisao(true), AUTO_REFRESH_MS);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
    else iniciar();
})();
