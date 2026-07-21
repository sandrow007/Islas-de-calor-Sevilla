if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
        .then(registration => {
            console.log('Service Worker registrado:', registration.scope);
        })
        .catch(err => {
            console.error('Fallo en el registro del Service Worker:', err);
        });
    });
}

// Aquí debajo continuaría el resto de tu lógica de la aplicación...
'use strict';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* ================================================================
   MODULE: Configuration
   ================================================================ */
const CFG = {
  lat:37.3826, lon:-5.9962, city:'Sevilla', altitude:7,
  AEMET_KEY:'TU_API_KEY_AEMET', AEMET_MUN:'41091',
  mapZoom:12, wxInterval:300000, issInterval:10000, CLICKS:5,
  C:'#00f0ff', M:'#ff00e5', V:'#7b2fff', T:'#00ffc8', G:'#ffd745',
};
const PH = {
  h:6.62607015e-34, hb:1.054571817e-34, k:1.380649e-23,
  c:2.99792458e8, sig:5.670374419e-8, R:8.314462618,
  g:9.80665, Ma:0.0289644, Rv:461.52, Rd:287.05,
  L:0.0065, T0:288.15, P0:101325.0, S0:1361.0, bW:2.897771955e-3,
  ALBEDO:{urban:.15,asphalt:.12,concrete:.32,vegetation:.25,grass:.20,water:.06,soil:.19,airport:.13},
};

/* ================================================================
   MODULE: Three.js Intro Scene
   ================================================================ */
let scene, camera, renderer, controls, giralda, particles, composer, bloomPass;
let raycaster, mouse;
let clickCounter = 0;
let introAnimationId;

function initThreeScene() {
    const canvas = document.getElementById('qcanv');
    if (!canvas) return;

    // 1. Scene Setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 15);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x03050f, 1);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // 3. Giralda Model
    giralda = createGiralda();
    giralda.name = "Giralda";
    scene.add(giralda);

    // 4. Particle System
    particles = createQuantumParticles();
    scene.add(particles);

    // 5. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 1.5;
    controls.minPolarAngle = Math.PI / 4;
    
    // 6. Post-processing (Bloom for Neon Glow)
    const renderScene = new RenderPass(scene, camera);
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.1;
    bloomPass.strength = 1.2;
    bloomPass.radius = 0.5;
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // 7. Raycasting for Clicks
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    canvas.addEventListener('click', onCanvasClick);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start animation loop
    animateIntro();
}

function createGiralda() {
    const group = new THREE.Group();
    const emissiveColor = new THREE.Color(CFG.C);

    const createBlock = (width, height, depth, yPos) => {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({
            color: 0x94b2e4,
            emissive: emissiveColor,
            emissiveIntensity: 0.2,
            roughness: 0.6,
            metalness: 0.2
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = yPos;
        return mesh;
    };

    // Simplified procedural model based on the 2D drawing's proportions
    const base = createBlock(4, 10, 4, -2);
    const mid = createBlock(3, 5, 3, 5.5);
    const top = createBlock(2, 4, 2, 10);
    const spireBase = createBlock(1, 1, 1, 12.5);
    
    const spireGeom = new THREE.ConeGeometry(0.5, 3, 8);
    const spireMat = new THREE.MeshStandardMaterial({
        color: 0xffd745,
        emissive: new THREE.Color(CFG.G),
        emissiveIntensity: 0.8
    });
    const spire = new THREE.Mesh(spireGeom, spireMat);
    spire.position.y = 14.5;

    group.add(base, mid, top, spireBase, spire);
    group.scale.set(0.5, 0.5, 0.5);
    group.position.y = -3;
    return group;
}

function createQuantumParticles() {
    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const baseColors = [new THREE.Color(CFG.C), new THREE.Color(CFG.M), new THREE.Color(CFG.V), new THREE.Color(CFG.T)];

    for (let i = 0; i < particleCount; i++) {
        const radius = 10 + Math.random() * 40;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.cos(phi);
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

        const color = baseColors[Math.floor(Math.random() * baseColors.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
    });

    return new THREE.Points(geometry, material);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function onCanvasClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(giralda.children, true);

    if (intersects.length > 0) {
        clickCounter++;
        showFeedback(clickCounter);

        // Visual feedback on click
        bloomPass.strength = 2.5;
        setTimeout(() => { bloomPass.strength = 1.2; }, 200);

        if (clickCounter >= CFG.CLICKS) {
            startQuantumMercury();
        }
    }
}

function showFeedback(n){
    const el=document.getElementById('cfb'), h=document.getElementById('hint');
    const keys=['c1','c2','c3','c4','c5'];
    el.textContent=t(keys[n-1]||'c1'); el.style.opacity='1'; h.style.opacity='0';
    if(n<CFG.CLICKS) setTimeout(() => {el.style.opacity='0';h.style.opacity='1';}, 1900);
}

function animateIntro() {
    introAnimationId = requestAnimationFrame(animateIntro);
    const time = Date.now() * 0.0005;

    // Animate particles
    if (particles) {
        particles.rotation.y = time * 0.2;
        particles.rotation.x = time * 0.1;
    }

    controls.update();
    composer.render();
}

/* ================================================================
   MODULE: Quantum Mercury Transition (Shader)
   ================================================================ */
const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    uniform float time;
    uniform float progress;
    uniform vec2 resolution;
    varying vec2 vUv;

    // 2D Random
    float random (vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    // 2D Noise
    float noise (vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
        vec2 centeredUv = vUv - 0.5;
        float dist = length(centeredUv * 2.0);

        // Colors
        vec3 color1 = vec3(0.0, 0.94, 1.0); // Cyan
        vec3 color2 = vec3(0.48, 0.18, 1.0); // Violet
        vec3 color3 = vec3(1.0, 0.0, 0.9);   // Magenta

        // Energy waves
        float wave = sin(dist * 25.0 - time * 5.0) * 0.5 + 0.5;
        
        // Noise for turbulence
        float turb = noise(centeredUv * 5.0 + time * 0.5);

        // Mix colors
        vec3 color = mix(color1, color2, smoothstep(0.3, 0.7, dist + turb * 0.1));
        color = mix(color, color3, wave);

        // Chromatic Aberration
        float aberration = 0.02 * progress;
        vec3 ca_color;
        ca_color.r = texture2D(vec4(color, 1.0), vUv + vec2(aberration, 0.0)).r;
        ca_color.g = color.g;
        ca_color.b = texture2D(vec4(color, 1.0), vUv - vec2(aberration, 0.0)).b;

        // Flashes
        float flash = smoothstep(0.95, 1.0, sin(time * 20.0 + dist * 10.0) * 0.5 + 0.5);
        vec3 final_color = ca_color + flash * 0.5;

        // Fade in/out effect
        float alpha = smoothstep(0.0, 0.2, progress) * (1.0 - smoothstep(0.8, 1.0, progress));
        
        gl_FragColor = vec4(final_color, alpha);
    }
`;

function startQuantumMercury() {
    // Stop the intro animation
    if (introAnimationId) {
        cancelAnimationFrame(introAnimationId);
    }
    document.getElementById('qcanv').removeEventListener('click', onCanvasClick);

    // Create a full-screen quad for the shader effect
    const transitionGeometry = new THREE.PlaneGeometry(2, 2);
    const transitionMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            time: { value: 0.0 },
            progress: { value: 0.0 },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        transparent: true,
        depthWrite: false
    });

    const transitionMesh = new THREE.Mesh(transitionGeometry, transitionMaterial);
    const transitionScene = new THREE.Scene();
    const transitionCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    transitionScene.add(transitionMesh);

    let startTime = Date.now();
    const duration = 2500; // 2.5 seconds

    function animateTransition() {
        const elapsedTime = Date.now() - startTime;
        let progress = elapsedTime / duration;
        
        transitionMaterial.uniforms.time.value += 0.05;
        transitionMaterial.uniforms.progress.value = progress;

        renderer.render(transitionScene, transitionCamera);

        if (progress < 1.0) {
            requestAnimationFrame(animateTransition);
        } else {
            revealDash();
            // Clean up Three.js resources
            renderer.dispose();
            scene.clear();
            transitionScene.clear();
            giralda = null;
            particles = null;
            composer = null;
        }
    }
    
    animateTransition();
}

/* ================================================================
   MODULE: Dashboard Controller & Routing
   ================================================================ */
function revealDash(){
  document.getElementById('pi').style.display='none';
  const d=document.getElementById('pd');
  d.style.display='block'; d.style.opacity='0'; d.style.transition='opacity .8s ease';
  setTimeout(() => { d.style.opacity='1'; initDash(); }, 80);
}

let dashR=false;
function initDash(){
  if(dashR) return; dashR=true;
  initDashboardTabs();
  applyI18n(); initLogo(); initBg(); initDGrid(); initCharts();
  setTimeout(initMap,120);
  startLoad();
  updateQuantumControls();
}

function initDashboardTabs() {
    const tabs = document.querySelectorAll('.dash-tab');
    const panels = document.querySelectorAll('.dash-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPanelId = tab.dataset.tab;

            // Update tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update panels
            panels.forEach(panel => {
                if (panel.dataset.panelId === targetPanelId) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });
        });
    });
}

function startLoad(){
  if(online){ loadAll().catch(()=>runISA()); loadISS(); loadSW(); fetchDailyForecastForQuantum().catch(()=>{}); }
  else{ runISA(); showOffISS(); }
}

/* ================================================================
   MODULE: i18n — i18next proper integration (expanded, richer translations)
   ================================================================ */
const I18N_RESOURCES = {
  es:{translation:{
    appSub:'MOTOR CUANTICO CLIMATICO',src:'Fuentes: Open-Meteo · NASA POWER · NOAA SWPC',
    hint:'toca la Giralda 5 veces para acceder',
    c1:'1/5 — malla cuantica responde',c2:'2/5 — campo cuantico activo',
    c3:'3/5 — resonancia almohade',c4:'4/5 — protocolo QPU activo',c5:'mercurio cuantico...',
    wTitle:'CLIMA EN TIEMPO REAL',issTitle:'ISS EN TIEMPO REAL',mapTitle:'ISLAS DE CALOR · SEVILLA',
    swTitle:'CLIMA ESPACIAL · NOAA',qTitle:'MOTOR CUANTICO · ANGLE FEATURE MAP',chartTitle:'PREDICCION 48h',
    physTitle:'NUCLEO FISICO — Stefan-Boltzmann + Brutsaert',
    temp:'TEMP',wind:'VIENTO',hum:'HUMEDAD',pres:'PRESION',alt:'ALTITUD',vel:'VELOCIDAD',
    tSurf:'T SUPERFICIE',tAire:'T AIRE',tVirt:'T VIRTUAL',radSol:'RAD SOLAR',radNet:'RAD NETA',lAtm:'L ATMOS',
    loading:'Cargando datos reales...',gridBtn:'MALLA',
    modeOn:'Modo: Datos reales (API)',modeOff:'Modo: Simulacion ISA',
    qciLabel:'INDICE CUANTICO CLIMATICO (QCI)',
    citizenLbl:'CIUDADANO',scientistLbl:'CIENTIFICO',
    cRisk:'Riesgo climatico',cHeat:'Calor urbano en la calle',cSun:'Radiacion solar',cHum:'Sensacion higrotermica',
    riskLow:'BAJO — Puedes hacer vida normal en el exterior, aunque nunca esta de mas llevar agua encima.',
    riskMed:'MODERADO — Evita las horas centrales del dia (12:00-17:00) y busca sombra si vas a estar fuera un rato largo.',
    riskHi:'ALTO — Mejor quedarse en interiores o a la sombra ahora mismo; el sol directo puede sentar realmente mal.',
    cRiskExplain:'Esto resume, en una sola palabra, si hoy toca tener cuidado con el calor o no. Lo calcula el motor cuantico combinando temperatura, sol y humedad.',
    cHeatExplain:'El asfalto y los edificios del centro acumulan mucho mas calor que un parque. Esta es la diferencia real que notarias si caminases del uno al otro.',
    cSunExplain:'Cuanto mas fuerte pega el sol ahora mismo, mas rapido te puedes quemar o deshidratar si estas al aire libre.',
    cHumExplain:'Cuando el suelo esta mucho mas caliente que el aire y encima hay humedad, el cuerpo suda pero le cuesta refrescarse.',
    q1Title:'MOTOR CUANTICO REAL - SIMULADOR DE ESTADO',
    q1Badge:'ESTADO CUANTICO REAL',
    q1Explain:'Este motor ejecuta un circuito cuantico REAL: un vector de estado con amplitudes complejas, puertas unitarias (H, RY, RZ, CNOT) y una medicion final por la regla de Born, alimentado con el pronostico REAL de Open-Meteo para Sevilla. No es hardware cuantico: es una simulacion clasica correcta y verificable de un circuito cuantico pequeno, ejecutada en tu propio navegador.',
    q1ExplainCitizen:'Manolit infinito usa un pequeno "cerebro cuantico" para mezclar varios dias de pronostico real y sacar una prediccion propia de temperatura. Cuantos mas qubits y mas mediciones uses, mas fina sale la cuenta, pero tambien tarda un poco mas.',
    qHorizon:'Horizonte de prediccion',qQubits:'Numero de qubits',qShots:'Mediciones (shots)',
    qRun:'EJECUTAR SIMULACION CUANTICA',
    q2Title:'PREDICCION CUANTICA',
    qPred:'PREDICCION',qConf:'CONFIANZA',qNorm:'NORMA ESTADO',qEnt:'ENTRELAZAMIENTO',qGates:'PUERTAS',
    q3Title:'HISTOGRAMA DE MEDICION',q3Info:'Distribucion real de resultados tras medir el registro cuantico por la regla de Born (cuantas veces salio cada temperatura al repetir el experimento).',
    q4Title:'CUANTICO VS CLASICO',q4Info:'Comparacion entre el pronostico clasico de Open-Meteo y la ponderacion que hace el circuito cuantico sobre esos mismos datos reales.',
    qNoData:'Aun no hay datos de pronostico suficientes para alimentar el circuito. Espera unos segundos y vuelve a intentarlo.',
    qRunning:'Ejecutando circuito real...',
    qciExplainSci:'Cada qubit codifica una variable fisica real (temperatura, humedad, viento, radiacion) como un angulo de rotacion. Una cadena de puertas CNOT los entrelaza para capturar correlaciones entre variables.',
    qciExplainCit:'Es un numero de 0 a 100 que resume, de un vistazo, lo exigente que es el clima ahora mismo combinando calor, sol y humedad, cuanto mas alto, mas precaucion conviene tener.',
  }},
  en:{translation:{
    appSub:'QUANTUM CLIMATE ENGINE',src:'Sources: Open-Meteo · NASA POWER · NOAA SWPC',
    hint:'click the Giralda 5 times to enter',
    c1:'1/5 - quantum mesh responds',c2:'2/5 - quantum field active',
    c3:'3/5 - Almohad resonance',c4:'4/5 - QPU protocol active',c5:'quantum mercury...',
    wTitle:'REAL-TIME CLIMATE',issTitle:'ISS REAL-TIME',mapTitle:'HEAT ISLANDS - SEVILLE',
    swTitle:'SPACE WEATHER - NOAA',qTitle:'QUANTUM ENGINE - ANGLE FEATURE MAP',chartTitle:'48H FORECAST',
    physTitle:'PHYSICS CORE - Stefan-Boltzmann + Brutsaert',
    temp:'TEMP',wind:'WIND',hum:'HUMIDITY',pres:'PRESSURE',alt:'ALTITUDE',vel:'VELOCITY',
    tSurf:'SURFACE T',tAire:'AIR T',tVirt:'VIRTUAL T',radSol:'SOLAR RAD',radNet:'NET RAD',lAtm:'L ATMOS',
    loading:'Loading real data...',gridBtn:'GRID',
    modeOn:'Mode: Real data (API)',modeOff:'Mode: ISA simulation',
    qciLabel:'QUANTUM CLIMATE INDEX (QCI)',
    citizenLbl:'CITIZEN',scientistLbl:'SCIENTIST',
    cRisk:'Climate risk',cHeat:'Urban heat on the street',cSun:'Solar radiation',cHum:'Hygrothermal sensation',
    riskLow:'LOW - You can go about your day outdoors normally, though it never hurts to carry water.',
    riskMed:'MODERATE - Avoid the midday hours (12:00-17:00) and look for shade if you will be out for a while.',
    riskHi:'HIGH - Better to stay indoors or in the shade right now; direct sun can really take a toll.',
    cRiskExplain:'This sums up, in one word, whether today calls for extra care with the heat. The quantum engine works it out by combining temperature, sun and humidity.',
    cHeatExplain:'Asphalt and buildings in the city centre store far more heat than a park. This is the real difference you would feel walking from one to the other.',
    cSunExplain:'The stronger the sun is hitting right now, the faster you can get sunburnt or dehydrated outdoors.',
    cHumExplain:'When the ground is much hotter than the air and there is humidity too, your body sweats but struggles to cool down.',
    q1Title:'REAL QUANTUM ENGINE - STATE SIMULATOR',
    q1Badge:'REAL QUANTUM STATE',
    q1Explain:'This engine runs a REAL quantum circuit: a state vector with complex amplitudes, unitary gates (H, RY, RZ, CNOT) and a final measurement via the Born rule, fed with REAL Open-Meteo forecast data for Seville. It is not quantum hardware: it is a correct, verifiable classical simulation of a small quantum circuit, running in your own browser.',
    q1ExplainCitizen:'Manolit infinity uses a small "quantum brain" to blend several days of real forecast and produce its own temperature prediction. More qubits and more measurements make the estimate finer, but it also takes a little longer.',
    qHorizon:'Prediction horizon',qQubits:'Number of qubits',qShots:'Measurements (shots)',
    qRun:'RUN QUANTUM SIMULATION',
    q2Title:'QUANTUM PREDICTION',
    qPred:'PREDICTION',qConf:'CONFIDENCE',qNorm:'STATE NORM',qEnt:'ENTANGLEMENT',qGates:'GATES',
    q3Title:'MEASUREMENT HISTOGRAM',q3Info:'Real distribution of results after measuring the quantum register via the Born rule.',
    q4Title:'QUANTUM VS CLASSICAL',q4Info:'Comparison between the classical Open-Meteo forecast and the weighting the quantum circuit produces over that same real data.',
    qNoData:'There is not enough forecast data yet to feed the circuit. Wait a few seconds and try again.',
    qRunning:'Running real circuit...',
    qciExplainSci:'Each qubit encodes a real physical variable (temperature, humidity, wind, radiation) as a rotation angle. A chain of CNOT gates entangles them to capture correlations between variables.',
    qciExplainCit:'A number from 0 to 100 that sums up, at a glance, how demanding the weather is right now, the higher it is, the more caution is worth taking.',
  }},
  ca:{translation:{
    appSub:'MOTOR QUANTIC CLIMATIC',src:'Fonts: Open-Meteo · NASA POWER · NOAA SWPC',
    hint:'toca la Giralda 5 vegades per entrar',
    c1:'1/5 - malla quantica respon',c2:'2/5 - camp quantic actiu',
    c3:'3/5 - ressonancia almohade',c4:'4/5 - protocol QPU actiu',c5:'mercuri quantic...',
    wTitle:'CLIMA EN TEMPS REAL',issTitle:'ISS EN TEMPS REAL',mapTitle:'ILLES DE CALOR - SEVILLA',
    swTitle:'CLIMA ESPACIAL - NOAA',qTitle:'MOTOR QUANTIC - ANGLE FEATURE MAP',chartTitle:'PREDICCIO 48h',
    physTitle:'NUCLI FISIC - Stefan-Boltzmann + Brutsaert',
    temp:'TEMP',wind:'VENT',hum:'HUMITAT',pres:'PRESSIO',alt:'ALTITUD',vel:'VELOCITAT',
    tSurf:'T SUPERFICIE',tAire:'T AIRE',tVirt:'T VIRTUAL',radSol:'RAD SOLAR',radNet:'RAD NETA',lAtm:'L ATMOS',
    loading:'Carregant dades reals...',gridBtn:'MALLA',
    modeOn:'Mode: Dades reals (API)',modeOff:'Mode: Simulacio ISA',
    qciLabel:'INDEX QUANTIC CLIMATIC (QCI)',citizenLbl:'CIUTADA',scientistLbl:'CIENTIFIC',
    cRisk:'Risc climatic',cHeat:'Calor urba al carrer',cSun:'Radiacio solar',cHum:'Sensacio higrotermica',
    riskLow:'BAIX - Pots fer vida normal a l\u2019exterior, tot i que mai fa mal portar aigua.',
    riskMed:'MODERAT - Evita les hores centrals del dia (12:00-17:00) i busca ombra si estaras fora una estona llarga.',
    riskHi:'ALT - Millor quedar-se a dins o a l\u2019ombra ara mateix; el sol directe pot sentar molt malament.',
    cRiskExplain:'Aixo resumeix, en una paraula, si avui cal anar amb compte amb la calor.',
    cHeatExplain:'L\u2019asfalt i els edificis del centre acumulen molta mes calor que un parc.',
    cSunExplain:'Com mes fort pica el sol ara mateix, mes rapid et pots cremar o deshidratar a l\u2019exterior.',
    cHumExplain:'Quan el terra esta molt mes calent que l\u2019aire i a mes hi ha humitat, el cos sua pero li costa refrescar-se.',
    q1Title:'MOTOR QUANTIC REAL - SIMULADOR D\u2019ESTAT',q1Badge:'ESTAT QUANTIC REAL',
    q1Explain:'Aquest motor executa un circuit quantic REAL: un vector d\u2019estat amb amplituds complexes, portes unitaries (H, RY, RZ, CNOT) i una mesura final per la regla de Born, alimentat amb la prediccio REAL d\u2019Open-Meteo per a Sevilla.',
    q1ExplainCitizen:'Manolit infinit fa servir un petit "cervell quantic" per barrejar diversos dies de prediccio real.',
    qHorizon:'Horitzo de prediccio',qQubits:'Nombre de qubits',qShots:'Mesures (shots)',qRun:'EXECUTA SIMULACIO QUANTICA',
    q2Title:'PREDICCIO QUANTICA',qPred:'PREDICCIO',qConf:'CONFIANCA',qNorm:'NORMA ESTAT',qEnt:'ENTRELLACAT',qGates:'PORTES',
    q3Title:'HISTOGRAMA DE MESURA',q3Info:'Distribucio real de resultats despres de mesurar el registre quantic per la regla de Born.',
    q4Title:'QUANTIC VS CLASSIC',q4Info:'Comparacio entre la prediccio classica d\u2019Open-Meteo i la ponderacio del circuit quantic.',
    qNoData:'Encara no hi ha prou dades de prediccio per alimentar el circuit.',
    qRunning:'Executant circuit real...',
    qciExplainSci:'Cada qubit codifica una variable fisica real com un angle de rotacio, entrellacats amb portes CNOT.',
    qciExplainCit:'Un numero de 0 a 100 que resumeix com d\u2019exigent es el clima ara mateix.',
  }},
  gl:{translation:{
    appSub:'MOTOR CUANTICO CLIMATICO',src:'Fontes: Open-Meteo · NASA POWER · NOAA SWPC',
    hint:'toca a Giralda 5 veces para entrar',
    c1:'1/5 - malla cuantica responde',c2:'2/5 - campo cuantico activo',
    c3:'3/5 - resonancia almohade',c4:'4/5 - protocolo QPU activo',c5:'mercurio cuantico...',
    wTitle:'CLIMA EN TEMPO REAL',issTitle:'ISS EN TEMPO REAL',mapTitle:'ILLAS DE CALOR - SEVILLA',
    swTitle:'CLIMA ESPACIAL - NOAA',qTitle:'MOTOR CUANTICO - ANGLE FEATURE MAP',chartTitle:'PREDICCION 48h',
    physTitle:'NUCLEO FISICO - Stefan-Boltzmann + Brutsaert',
    temp:'TEMP',wind:'VENTO',hum:'HUMIDADE',pres:'PRESION',alt:'ALTITUDE',vel:'VELOCIDADE',
    tSurf:'T SUPERFICIE',tAire:'T AIRE',tVirt:'T VIRTUAL',radSol:'RAD SOLAR',radNet:'RAD NETA',lAtm:'L ATMOS',
    loading:'Cargando datos reais...',gridBtn:'MALLA',modeOn:'Modo: Datos reais (API)',modeOff:'Modo: Simulacion ISA',
    qciLabel:'INDICE CUANTICO CLIMATICO (QCI)',citizenLbl:'CIDADAN',scientistLbl:'CIENTIFICO',
    cRisk:'Risco climatico',cHeat:'Calor urbana na rua',cSun:'Radiacion solar',cHum:'Sensacion higrotermica',
    riskLow:'BAIXO - Podes facer vida normal no exterior, ainda que nunca esta de mais levar auga.',
    riskMed:'MODERADO - Evita as horas centrais do dia (12:00-17:00) e busca sombra se vas estar fora un bo anaco.',
    riskHi:'ALTO - Mellor quedar en interiores ou a sombra agora mesmo; o sol directo pode sentar moi mal.',
    cRiskExplain:'Isto resume, nunha soa palabra, se hoxe compre ter coidado co calor.',
    cHeatExplain:'O asfalto e os edificios do centro acumulan moito mais calor ca un parque.',
    cSunExplain:'Canto mais forte pega o sol agora mesmo, mais rapido te podes queimar ou deshidratar ao aire libre.',
    cHumExplain:'Cando o chan esta moito mais quente ca o aire e ademais hai humidade, o corpo suda pero costalle refrescarse.',
    q1Title:'MOTOR CUANTICO REAL - SIMULADOR DE ESTADO',q1Badge:'ESTADO CUANTICO REAL',
    q1Explain:'Este motor executa un circuito cuantico REAL: un vector de estado con amplitudes complexas, portas unitarias (H, RY, RZ, CNOT) e unha medicion final pola regra de Born, alimentado co pronostico REAL de Open-Meteo.',
    q1ExplainCitizen:'Manolit infinito usa un pequeno "cerebro cuantico" para mesturar varios dias de pronostico real.',
    qHorizon:'Horizonte de prediccion',qQubits:'Numero de qubits',qShots:'Medicions (shots)',qRun:'EXECUTAR SIMULACION CUANTICA',
    q2Title:'PREDICCION CUANTICA',qPred:'PREDICCION',qConf:'CONFIANZA',qNorm:'NORMA ESTADO',qEnt:'ENTRELAZAMENTO',qGates:'PORTAS',
    q3Title:'HISTOGRAMA DE MEDICION',q3Info:'Distribucion real de resultados tras medir o rexistro cuantico pola regra de Born.',
    q4Title:'CUANTICO VS CLASICO',q4Info:'Comparacion entre o pronostico clasico de Open-Meteo e a ponderacion do circuito cuantico.',
    qNoData:'Aínda non hai datos de pronostico abondos para alimentar o circuito.',
    qRunning:'Executando circuito real...',
    qciExplainSci:'Cada qubit codifica unha variable fisica real como un angulo de rotacion, entrelazados con portas CNOT.',
    qciExplainCit:'Un numero de 0 a 100 que resume, dunha soa ollada, o esixente que e o clima agora mesmo.',
  }},
  eu:{translation:{
    appSub:'MOTOR KUANTIKO KLIMATIKOA',src:'Iturriak: Open-Meteo · NASA POWER · NOAA SWPC',
    hint:'sakatu Giralda 5 aldiz sartzeko',
    c1:'1/5 - sare kuantikoa erantzuten',c2:'2/5 - eremu kuantikoa aktibo',
    c3:'3/5 - almoade erresonantzia',c4:'4/5 - QPU protokoloa aktibo',c5:'merkurio kuantikoa...',
    wTitle:'DENBORA ERREALEKO KLIMA',issTitle:'ISS DENBORA ERREALEAN',mapTitle:'BERO-UHARTEAK - SEVILLA',
    swTitle:'ESPAZIO KLIMA - NOAA',qTitle:'MOTOR KUANTIKOA - ANGLE FEATURE MAP',chartTitle:'48h IRAGARPENA',
    physTitle:'FISIKA NUKLEOA - Stefan-Boltzmann + Brutsaert',
    temp:'TENP',wind:'HAIZEA',hum:'HEZETASUNA',pres:'PRESIOA',alt:'GARAIERA',vel:'ABIADURA',
    tSurf:'AZALERA T',tAire:'AIRE T',tVirt:'T BIRTUALA',radSol:'EGUZKI IRRAD',radNet:'IRRAD NETO',lAtm:'L ATMOS',
    loading:'Datu errealak kargatzen...',gridBtn:'SAREA',modeOn:'Modua: Datu errealak (API)',modeOff:'Modua: ISA simulazioa',
    qciLabel:'ADIERAZLE KUANTIKO KLIMATIKOA (QCI)',citizenLbl:'HIRITARRA',scientistLbl:'ZIENTZIALARIA',
    cRisk:'Arrisku klimatikoa',cHeat:'Hiri-beroa kalean',cSun:'Eguzki erradiazioa',cHum:'Sentsazio higrotermikoa',
    riskLow:'BAXUA - Kanpoan bizitza normala egin dezakezu, baina beti komeni da ura eramatea.',
    riskMed:'MODERATUA - Saihestu eguerdiko orduak (12:00-17:00) eta bilatu itzala kanpoan luze bazaude.',
    riskHi:'ALTUA - Hobe da orain barruan edo itzalean egotea; eguzki zuzenak kalte egin dezake.',
    cRiskExplain:'Honek hitz batean laburbiltzen du gaur beroarekin kontuz ibili behar den.',
    cHeatExplain:'Zoladurak eta hiri erdiko eraikinek parke batek baino bero askoz gehiago metatzen dute.',
    cSunExplain:'Orain eguzkiak zenbat eta gogorrago jotzen, orduan eta azkarrago erre edo deshidrata zaitezke kanpoan.',
    cHumExplain:'Lurra airea baino askoz beroagoa dagoenean eta gainera hezetasuna dagoenean, zaila da freskatzea.',
    q1Title:'MOTOR KUANTIKO ERREALA - EGOERA SIMULATZAILEA',q1Badge:'EGOERA KUANTIKO ERREALA',
    q1Explain:'Motor honek benetako zirkuitu kuantiko bat exekutatzen du: egoera-bektore bat anplitude konplexuekin, ate unitarioak (H, RY, RZ, CNOT) eta Born arauaren araberako neurketa, Open-Meteoren benetako iragarpenarekin elikatuta.',
    q1ExplainCitizen:'Manolit infinituk "garun kuantiko" txiki bat erabiltzen du benetako iragarpeneko hainbat egun nahasteko.',
    qHorizon:'Iragarpen horizontea',qQubits:'Qubit kopurua',qShots:'Neurketak (shots)',qRun:'EXEKUTATU SIMULAZIO KUANTIKOA',
    q2Title:'IRAGARPEN KUANTIKOA',qPred:'IRAGARPENA',qConf:'KONFIANTZA',qNorm:'EGOERA NORMA',qEnt:'KORAPILATZEA',qGates:'ATEAK',
    q3Title:'NEURKETA HISTOGRAMA',q3Info:'Erregistro kuantikoa Born arauaren bidez neurtu ondorengo emaitzen benetako banaketa.',
    q4Title:'KUANTIKOA VS KLASIKOA',q4Info:'Open-Meteoren iragarpen klasikoaren eta zirkuitu kuantikoaren haztapenaren arteko konparaketa.',
    qNoData:'Oraindik ez dago behar adina iragarpen datu zirkuitua elikatzeko.',
    qRunning:'Zirkuitu erreala exekutatzen...',
    qciExplainSci:'Qubit bakoitzak benetako aldagai fisiko bat kodetzen du biraketa angelu gisa.',
    qciExplainCit:'0tik 100era doan zenbaki bat, orain eguraldia zenbateraino exijentea den laburbiltzen duena.',
  }},
  va:{translation:{
    appSub:'MOTOR QUANTIC CLIMATIC',src:'Fonts: Open-Meteo · NASA POWER · NOAA SWPC',
    hint:'toca la Giralda 5 vegades per a entrar',
    c1:'1/5 - malla quantica respon',c2:'2/5 - camp quantic actiu',
    c3:'3/5 - ressonancia almohade',c4:'4/5 - protocol QPU actiu',c5:'mercuri quantic...',
    wTitle:'CLIMA EN TEMPS REAL',issTitle:'ISS EN TEMPS REAL',mapTitle:'ILLES DE CALOR - SEVILLA',
    swTitle:'CLIMA ESPACIAL - NOAA',qTitle:'MOTOR QUANTIC - ANGLE FEATURE MAP',chartTitle:'PREDICCIO 48h',
    physTitle:'NUCLI FISIC - Stefan-Boltzmann + Brutsaert',
    temp:'TEMP',wind:'VENT',hum:'HUMITAT',pres:'PRESSIO',alt:'ALTITUD',vel:'VELOCITAT',
    tSurf:'T SUPERFICIE',tAire:'T AIRE',tVirt:'T VIRTUAL',radSol:'RAD SOLAR',radNet:'RAD NETA',lAtm:'L ATMOS',
    loading:'Carregant dades reals...',gridBtn:'MALLA',modeOn:'Mode: Dades reals (API)',modeOff:'Mode: Simulacio ISA',
    qciLabel:'INDEX QUANTIC CLIMATIC (QCI)',citizenLbl:'CIUTADA',scientistLbl:'CIENTIFIC',
    cRisk:'Risc climatic',cHeat:'Calor urba al carrer',cSun:'Radiacio solar',cHum:'Sensacio higrotermica',
    riskLow:'BAIX - Pots fer vida normal a l\u2019exterior, encara que mai esta de mes portar aigua.',
    riskMed:'MODERAT - Evita les hores centrals del dia (12:00-17:00) i busca ombra si vas a estar fora una bona estona.',
    riskHi:'ALT - Millor quedar-se a dins o a l\u2019ombra ara mateix; el sol directe pot sentar molt malament.',
    cRiskExplain:'Aixo resumeix, en una paraula, si hui cal anar en compte amb la calor.',
    cHeatExplain:'L\u2019asfalt i els edificis del centre acumulen molta mes calor que un parc.',
    cSunExplain:'Com mes fort pega el sol ara mateix, mes rapid et pots cremar o deshidratar a l\u2019exterior.',
    cHumExplain:'Quan el terra esta molt mes calent que l\u2019aire i a mes hi ha humitat, costa mes refrescar-se.',
    q1Title:'MOTOR QUANTIC REAL - SIMULADOR D\u2019ESTAT',q1Badge:'ESTAT QUANTIC REAL',
    q1Explain:'Este motor executa un circuit quantic REAL: un vector d\u2019estat amb amplituds complexes, portes unitaries (H, RY, RZ, CNOT) i una mesura final per la regla de Born.',
    q1ExplainCitizen:'Manolit infinit fa servir un xicotet "cervell quantic" per a barrejar diversos dies de prediccio real.',
    qHorizon:'Horitzo de prediccio',qQubits:'Nombre de qubits',qShots:'Mesures (shots)',qRun:'EXECUTA SIMULACIO QUANTICA',
    q2Title:'PREDICCIO QUANTICA',qPred:'PREDICCIO',qConf:'CONFIANCA',qNorm:'NORMA ESTAT',qEnt:'ENTRELLACAT',qGates:'PORTES',
    q3Title:'HISTOGRAMA DE MESURA',q3Info:'Distribucio real de resultats despres de mesurar el registre quantic.',
    q4Title:'QUANTIC VS CLASSIC',q4Info:'Comparacio entre la prediccio classica d\u2019Open-Meteo i la ponderacio del circuit quantic.',
    qNoData:'Encara no hi ha prou dades de prediccio per a alimentar el circuit.',
    qRunning:'Executant circuit real...',
    qciExplainSci:'Cada qubit codifica una variable fisica real com un angle de rotacio.',
    qciExplainCit:'Un numero de 0 a 100 que resumeix com d\u2019exigent es el clima ara mateix.',
  }},
  oc:{translation:{
    appSub:'MOTOR QUANTIC CLIMATIC',src:'Fonts: Open-Meteo · NASA POWER · NOAA SWPC',
    hint:'toca era Giralda 5 cops enta dintrar',
    c1:'1/5 - malhada quantica respond',c2:'2/5 - camp quantic actiu',
    c3:'3/5 - ressonança almohade',c4:'4/5 - protocole QPU actiu',c5:'mercuri quantic...',
    wTitle:'CLIMA EN TEMPS REAL',issTitle:'ISS EN TEMPS REAL',mapTitle:'ISLANS DE CALOR - SEVILLA',
    swTitle:'CLIMA ESPACION - NOAA',qTitle:'MOTOR QUANTIC - ANGLE FEATURE MAP',chartTitle:'PREDICCION 48h',
    physTitle:'NUCLI FISIC - Stefan-Boltzmann + Brutsaert',
    temp:'TEMP',wind:'VENT',hum:'HUMIDITAT',pres:'PRESSION',alt:'ALTITUD',vel:'VELOCITAT',
    tSurf:'T SUPERFICIE',tAire:'T AIRE',tVirt:'T VIRTUAL',radSol:'RAD SOLAR',radNet:'RAD NETA',lAtm:'L ATMOS',
    loading:'Cargament de las dadas reaus...',gridBtn:'MALHADA',modeOn:'Mode: Dadas reaus (API)',modeOff:'Mode: Simulacion ISA',
    qciLabel:'INDEX QUANTIC CLIMATIC (QCI)',citizenLbl:'CIUTADAN',scientistLbl:'CIENTIFIC',
    cRisk:'Risc climatic',cHeat:'Calor urbana en era carriera',cSun:'Radiacion solara',cHum:'Sensacion higrotermica',
    riskLow:'BAISH - Pos har vida normala en exterior, çò que non mancara jamès portar aiga.',
    riskMed:'MODERAT - Evita es oras centralas dera jornada (12:00-17:00) e cerca ombra se demoraras fora bera pausa.',
    riskHi:'NAUT - Melhor demorar laguens o en ombra ara meteish; eth solelh dirècte pot her mau de vertat.',
    cRiskExplain:'Aço resumis, en un mot, se cau anar en compde damb era calor uei.',
    cHeatExplain:'Eth asfalt e es edificis deth centre acumulen forca mes calor qu\u2019un parc.',
    cSunExplain:'Com mes fort bat eth solelh ara meteish, mes viste te pos cremar o deshidratar en exterior.',
    cHumExplain:'Quan eth sol ei forca mes caud que er aire e i a tanben umiditat, costa mes refrescar-se.',
    q1Title:'MOTOR QUANTIC REAU - SIMULADOR D\u2019ESTAT',q1Badge:'ESTAT QUANTIC REAU',
    q1Explain:'Aguest motor executa un circuit quantic REAU alimentat damb eth pronostic REAU d\u2019Open-Meteo entà Sevilla.',
    q1ExplainCitizen:'Manolit infinit utilise un petit "cervèth quantic" enta mesclar diuèrsi dias de pronostic reau.',
    qHorizon:'Orizont de prediccion',qQubits:'Nombre de qubits',qShots:'Mesuras (shots)',qRun:'EXECUTAR SIMULACION QUANTICA',
    q2Title:'PREDICCION QUANTICA',qPred:'PREDICCION',qConf:'CONFIANÇA',qNorm:'NORMA ESTAT',qEnt:'ENTRELAÇAMENT',qGates:'PORTAS',
    q3Title:'HISTOGRAMA DE MESURA',q3Info:'Distribucion reau des resultats après mesurar eth registre quantic.',
    q4Title:'QUANTIC VS CLASSIC',q4Info:'Comparason entre eth pronostic classic d\u2019Open-Meteo e era ponderacion deth circuit quantic.',
    qNoData:'Encara non i a pro dadas de pronostic enta alimentar eth circuit.',
    qRunning:'Executant circuit reau...',
    qciExplainSci:'Cada qubit codifique ua variabla fisica reau coma un angle de rotacion.',
    qciExplainCit:'Un numero de 0 a 100 que resumis com d\u2019exigent ei eth clima ara meteish.',
  }},
};

const t = key => i18next.t(key);

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if(val && val !== key) el.innerHTML = val;
  });
  updateConnBar();
}

document.querySelectorAll('.lbtn').forEach(b => b.addEventListener('click', () => {
  if(b.dataset.lang === i18next.language) return;
  document.querySelectorAll('.lbtn').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  i18next.changeLanguage(b.dataset.lang).then(() => {
    applyI18n();
    updateQuantumDisplay();
    if(lastQuantumResult) renderQuantumResult(lastQuantumResult);
  });
}));

/* ================================================================
   MODULE: Connection
   ================================================================ */
let online = navigator.onLine;
function updateConnBar() {
  const d=document.getElementById('cdot'),s=document.getElementById('cstat');
  const dm=document.getElementById('dmmode');
  const txt=online?t('modeOn'):t('modeOff'), cls=online?'on':'off';
  if(d)d.className='cdot '+cls; if(s)s.textContent=txt;
  if(dm)dm.innerHTML=`<span class="cdot ${cls}" style="width:5px;height:5px;border-radius:50%;display:inline-block"></span>&nbsp;`;
}
window.addEventListener('online',  ()=>{ online=true;  updateConnBar(); if(dashR) startLoad(); });
window.addEventListener('offline', ()=>{ online=false; updateConnBar(); });

/* ================================================================
   MODULE: Citizen/Scientist Mode
   ================================================================ */
let sciMode = false;

const modeTrack = document.getElementById('mode-track');
modeTrack.addEventListener('click', toggleMode);
modeTrack.addEventListener('keydown', e => { if(e.key===' '||e.key==='Enter') toggleMode(); });

function toggleMode() {
  sciMode = !sciMode;
  modeTrack.classList.toggle('sci', sciMode);
  modeTrack.setAttribute('aria-checked', sciMode);
  document.getElementById('lbl-cit').classList.toggle('active', !sciMode);
  document.getElementById('lbl-sci').classList.toggle('active',  sciMode);
  document.getElementById('sci-view').style.display = sciMode ? 'block' : 'none';
  document.getElementById('cit-view').style.display = sciMode ? 'none'  : 'block';
  const q1e = document.getElementById('q1-explain');
  if(q1e) q1e.innerHTML = sciMode ? t('q1Explain') : t('q1ExplainCitizen');
  renderPhysicsFooter();
  updateQuantumDisplay();
  if(lastQuantumResult) renderQuantumResult(lastQuantumResult);
}

function renderPhysicsFooter(){
  const el = document.getElementById('phys-info');
  if(!el || !ATMOS.physics) return;
  if(sciMode){
    el.textContent = `${ATMOS.src} | ${CFG.city} | ${new Date().toLocaleTimeString()}`;
  } else {
    const ph = ATMOS.physics;
    const diff = (ph.T_surface - ph.T_air).toFixed(1);
    el.textContent = `El suelo esta ${diff>0?'+':''}°C respecto al aire — ${ATMOS.src}`;
  }
}

function renderCitizenCards(ph, qu) {
  if(!ph || !qu) return;
  const qci    = qu.QCI_composite;
  const T_surf = ph.T_surface.toFixed(1);
  const T_air  = ph.T_air.toFixed(1);
  const UHI    = parseFloat(ph.delta_UHI);
  const S_in   = ph.S_in;
  const RH     = ph.RH;

  const risk = qci > 66
    ? { cls:'c-risk-hi',  txt:t('riskHi'),  sym:'!' }
    : qci > 33
    ? { cls:'c-risk-med', txt:t('riskMed'), sym:'~' }
    : { cls:'c-risk-low', txt:t('riskLow'), sym:'+' };

  const heatMsg = UHI > 3
    ? `El asfalto urbano esta ${UHI.toFixed(1)}&deg;C mas caliente que los parques ahora mismo. Zonas de riesgo termico si caminas mucho por el centro.`
    : UHI > 1
    ? `La ciudad registra ${UHI.toFixed(1)}&deg;C mas que las areas verdes. Si puedes, busca sombra o un parque cercano.`
    : `Temperatura bastante uniforme entre la ciudad y las zonas verdes ahora mismo. El arbolado urbano esta compensando el calor.`;

  const sunMsg = S_in > 700
    ? `Radiacion intensa: ${S_in.toFixed(0)} W/m&#xB2;. Protector solar factor 50+ y gorra son casi obligatorios si vas a estar fuera.`
    : S_in > 350
    ? `Radiacion moderada: ${S_in.toFixed(0)} W/m&#xB2;. Conviene proteccion solar sobre todo entre las 12h y las 17h.`
    : S_in > 50
    ? `Radiacion baja: ${S_in.toFixed(0)} W/m&#xB2;. Condiciones bastante confortables para pasear.`
    : `Sin radiacion solar directa ahora mismo — normal si es de noche o esta nublado.`;

  const hiT = (T_surf - T_air);
  const sensMsg = hiT > 8
    ? `La superficie urbana esta ${hiT.toFixed(0)}&deg;C por encima del aire. Sensacion de "horno" al pisar asfalto o acera directamente.`
    : hiT > 4
    ? `El suelo radiante suma unos ${hiT.toFixed(0)}&deg;C extra a la sensacion termica respecto a lo que marca el aire.`
    : `Temperatura superficial proxima a la del aire ahora mismo. Condiciones razonablemente confortables.`;

  const humMsg = RH > 75
    ? `Humedad alta (%). Cuesta mas refrescarse porque el sudor se evapora peor.`
    : RH > 50
    ? `Humedad moderada (%). Con hidratacion regular vas sobrado.`
    : `Humedad baja (%). El calor es "seco" — el sudor se evapora rapido pero pierdes agua sin notarlo tanto.`;

  const cards = [
    { cls: risk.cls, sym: risk.sym, label: t('cRisk'), msg: risk.txt, explain: t('cRiskExplain') },
    { cls: 'c-card', sym: '~', label: t('cHeat'), msg: heatMsg, explain: t('cHeatExplain') },
    { cls: 'c-card', sym: '+', label: t('cSun'), msg: sunMsg, explain: t('cSunExplain') },
    { cls: 'c-card', sym: '~', label: t('cHum'), msg: ` `, explain: t('cHumExplain') },
  ];

  const el = document.getElementById('citizen-cards');
  if(el) el.innerHTML = cards.map(c => `
    <div class="c-card ${c.cls}">
      <div class="c-body">
        <strong>${c.label}</strong>
        <p>${c.msg}</p>
        <p style="opacity:.62;font-size:.6rem;margin-top:4px">${c.explain}</p>
      </div>
    </div>`).join('');
}

/* ================================================================
   MODULE: Physics Engine (preserved exactly)
   ================================================================ */
class PhysicsCore {
  satVaporPressure(T_C) {
    return 6.1078 * Math.exp(17.269 * T_C / (237.29 + T_C));
  }
  atmosphericDownwelling(T_air_C, RH) {
    const T_K = T_air_C + 273.15;
    const e_s = this.satVaporPressure(T_air_C);
    const e_a = (RH / 100) * e_s;
    const eps_atm = Math.min(1, 1.24 * Math.pow(e_a / T_K, 1/7));
    const L_down = eps_atm * PH.sig * Math.pow(T_K, 4);
    return { L_down, eps_atm, e_a, e_s };
  }
  surfaceTemperature(S_in, L_in, alpha) {
    const absorbed = S_in * (1 - alpha);
    const R_total = absorbed + L_in;
    const T_sup_K = Math.pow(Math.max(1, R_total) / PH.sig, 0.25);
    const L_out = PH.sig * Math.pow(T_sup_K, 4);
    const R_net = absorbed + L_in - L_out;
    return { T_sup_K, T_sup_C: T_sup_K - 273.15, L_out, R_net, absorbed };
  }
  virtualTemperature(T_air_C, RH, P_hPa) {
    const T_K = T_air_C + 273.15;
    const e_s = this.satVaporPressure(T_air_C);
    const e_a = (RH / 100) * e_s;
    const q = (PH.Rd / PH.Rv) * e_a / (P_hPa - (1 - PH.Rd/PH.Rv)*e_a);
    const T_v_K = T_K * (1 + 0.61 * q);
    return T_v_K - 273.15;
  }
  compute(T_air_C, RH, P_hPa, ws, S_in, surfaceType='urban') {
    const alpha = PH.ALBEDO[surfaceType] || 0.15;
    const atm = this.atmosphericDownwelling(T_air_C, RH);
    const surf = this.surfaceTemperature(S_in, atm.L_down, alpha);
    const T_virtual = this.virtualTemperature(T_air_C, RH, P_hPa);
    const surf_veg = this.surfaceTemperature(S_in, atm.L_down, PH.ALBEDO.vegetation);
    const delta_UHI = surf.T_sup_C - surf_veg.T_sup_C;
    return {
      T_air: T_air_C, T_surface: surf.T_sup_C, T_surface_K: surf.T_sup_K,
      T_virtual, alpha, S_in,
      L_down: atm.L_down, L_out: surf.L_out, R_net: surf.R_net,
      S_absorbed: surf.absorbed, eps_atm: atm.eps_atm,
      e_a: atm.e_a, RH, P: P_hPa, ws, delta_UHI,
      surfaceType,
    };
  }
}
const physCore = new PhysicsCore();

/* ================================================================
   MODULE: QuantumEncoder (Angle Feature Map)
   ================================================================ */
class QuantumEncoder {
  constructor() {
    this.bounds = {
      T_surface:  { min: -30,  max:  80  },
      T_air:      { min: -30,  max:  55  },
      RH:         { min:   0,  max: 100  },
      ws:         { min:   0,  max:  40  },
      S_in:       { min:   0,  max: 1100 },
      R_net:      { min: -300, max:  900 },
    };
    this.nQubits = 6;
    this.features = [
      { key: 'T_surface', label: 'T sup' },
      { key: 'T_air',     label: 'T aire' },
      { key: 'RH',        label: 'Hum %'  },
      { key: 'ws',        label: 'Viento' },
      { key: 'S_in',      label: 'S_in'   },
      { key: 'R_net',     label: 'R_net'  },
    ];
  }
  encodeAngle(value, key) {
    const b = this.bounds[key];
    const normalized = Math.max(0, Math.min(1, (value - b.min) / (b.max - b.min)));
    return Math.PI * normalized;
  }
  Ry(theta) {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    return [[c, -s], [s, c]];
  }
  applyGate(M, state) {
    return [
      M[0][0] * state[0] + M[0][1] * state[1],
      M[1][0] * state[0] + M[1][1] * state[1],
    ];
  }
  expectationZ(state) {
    return state[0] * state[0] - state[1] * state[1];
  }
  applyEntanglement(E_initial) {
    const E_final = new Array(E_initial.length);
    let prod = 1;
    for(let k = 0; k < E_initial.length; k++) {
      prod *= E_initial[k];
      E_final[k] = prod;
    }
    return E_final;
  }
  encode(physicsData) {
    const values = this.features.map(f => physicsData[f.key] ?? 0);
    const thetas = values.map((v, i) => this.encodeAngle(v, this.features[i].key));
    const init = [1, 0];
    const qubitStates = thetas.map(th => this.applyGate(this.Ry(th), init));
    const E_initial = qubitStates.map(s => this.expectationZ(s));
    const E_final = this.applyEntanglement(E_initial);
    const probs = E_final.map(e => ({
      p0: Math.max(0, (1 + e) / 2),
      p1: Math.max(0, (1 - e) / 2),
    }));
    const QCI_individual = E_final.map(e => (1 - e) * 50);
    const QCI_composite = QCI_individual[QCI_individual.length - 1];
    return {
      features: this.features.map((f,i)=>({...f, value: values[i]})),
      thetas, E_initial, E_final, probs, qubitStates, QCI_individual, QCI_composite,
    };
  }
}
const qEncoder = new QuantumEncoder();

/* Estado global */
const ATMOS = { T:0,P:1013,RH:50,ws:5,S_in:0, physics:null,quantum:null,
  confidence:1,agreement:'--',uncertainty:0,src:'init',npData:null, dailyForecast:null };

/* ================================================================
   MODULE: Logo Canvas
   ================================================================ */
function initLogo(){
  const cvs=document.getElementById('lc');
  if (!cvs) return;
  const ctx=cvs.getContext('2d');
  cvs.width=168; cvs.height=168;
  const CX=84,CY=84,R=84*.38; let lt=0;
  class VP{constructor(){this.r(true);}
    r(ini){const a=Math.random()*Math.PI*2,r=ini?Math.random()*R*.6:R*(.2+Math.random()*.3);
      this.x=CX+Math.cos(a)*r;this.y=CY+Math.sin(a)*r;
      this.ang=Math.atan2(this.y-CY,this.x-CX);this.rad=Math.hypot(this.x-CX,this.y-CY);
      this.sp=.01+Math.random()*.03;this.ssp=.02+Math.random()*.05;
      this.life=1;this.dec=.004+Math.random()*.007;this.sz=.9+Math.random()*2.2;this.ph=Math.random()*Math.PI*2;
      const cs=[{r:0,g:240,b:255},{r:0,g:255,b:200},{r:123,g:47,b:255},{r:255,g:0,b:229}];
      this.c=cs[Math.floor(Math.random()*cs.length)];}
    up(){this.ph+=.08;this.ang+=this.sp;
      this.rad+=this.ssp*(Math.sin(this.ph*.5)>.0?.4:-.25);
      this.x=CX+Math.cos(this.ang)*this.rad;this.y=CY+Math.sin(this.ang)*this.rad;
      this.life-=this.dec;if(this.rad>R||this.rad<2||this.life<=0)this.r(false);}
    dr(){const g=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.sz*3);
      g.addColorStop(0,`rgba(${this.c.r},${this.c.g},${this.c.b},${this.life})`);
      g.addColorStop(1,`rgba(${this.c.r},${this.c.g},${this.c.b},0)`);
      ctx.beginPath();ctx.arc(this.x,this.y,this.sz*3,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
      ctx.beginPath();ctx.arc(this.x,this.y,this.sz*.5,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,255,255,${this.life*.85})`;ctx.fill();}}
  const VPs=Array.from({length:32},()=>new VP());
  function al(){ctx.clearRect(0,0,168,168);lt++;
    ctx.save();ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.clip();
    for(let x=CX-R;x<=CX+R;x+=9){ctx.beginPath();
      for(let y=CY-R;y<=CY+R;y+=2){const d=Math.sqrt((x-CX)**2+(y-CY)**2),w=Math.sin(d*.08-lt*.035)*2;
        if(y===Math.round((CY-R)/2)*2)ctx.moveTo(x+w,y);else ctx.lineTo(x+w,y);}
      ctx.strokeStyle='rgba(0,240,255,.09)';ctx.lineWidth=.4;ctx.stroke();}ctx.restore();
    ctx.save();ctx.beginPath();
    for(let i=0;i<260;i++){const tt=i/46,r=tt*1.1,a=tt*2.5+lt*.07;ctx.lineTo(CX+Math.cos(a)*r,CY+Math.sin(a)*r);}
    ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=1.1;
    ctx.shadowColor='rgba(0,240,255,.8)';ctx.shadowBlur=7;ctx.stroke();ctx.restore();
    VPs.forEach(p=>{p.up();p.dr();});
    ctx.save();ctx.beginPath();ctx.arc(CX,CY,R-2,0,Math.PI*2);ctx.clip();
    drawGiralda2D(ctx,CX,CY+8,.2,0);ctx.restore();
    const lg=ctx.createLinearGradient(CX-R,CY-R,CX+R,CY+R);
    lg.addColorStop(0,'rgba(0,240,255,.9)');lg.addColorStop(.33,'rgba(123,47,255,.7)');
    lg.addColorStop(.66,'rgba(255,0,229,.62)');lg.addColorStop(1,'rgba(0,255,200,.8)');
    ctx.save();ctx.shadowColor='rgba(0,240,255,.6)';ctx.shadowBlur=18;
    ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.strokeStyle=lg;ctx.lineWidth=2.2;ctx.stroke();
    ctx.beginPath();ctx.arc(CX,CY,R-3.5,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=.8;
    ctx.setLineDash([5,7]);ctx.lineDashOffset=lt*.35;ctx.stroke();ctx.setLineDash([]);ctx.restore();
    requestAnimationFrame(al);}al();
}

function drawGiralda2D(ctx,x,y,sc,fl=0){
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
  const glow=5+fl*22,cM='rgba(196,220,255,0.97)',cS='rgba(148,178,228,0.90)';
  const cV='rgba(8,18,48,0.94)',cCy='rgba(0,240,255,0.72)',cVi='rgba(123,47,255,0.62)';
  const cSv='rgba(215,232,255,0.95)';
  ctx.shadowColor='#00f0ff';ctx.shadowBlur=glow;ctx.strokeStyle=cCy;ctx.lineWidth=0.6;
  function arch(ax,ay,w,h){
    const r=w/2;ctx.fillStyle=cV;ctx.shadowBlur=0;
    ctx.beginPath();ctx.rect(ax-r,ay,w,h);ctx.fill();
    ctx.beginPath();ctx.arc(ax,ay,r,Math.PI,0);ctx.fill();ctx.shadowBlur=glow;
  }
  ctx.fillStyle=cS;ctx.fillRect(-24,40,48,6);ctx.strokeRect(-24,40,48,6);
  ctx.fillRect(-21,34,42,7);ctx.strokeRect(-21,34,42,7);
  ctx.fillStyle=cM;ctx.beginPath();ctx.moveTo(-19,34);ctx.lineTo(19,34);
  ctx.lineTo(16,-57);ctx.lineTo(-16,-57);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=cCy;ctx.lineWidth=0.35;ctx.globalAlpha=0.28;
  [27,14,1,-12,-25,-38,-48].forEach(yb=>{
    const w=19-(34-yb)*0.037;ctx.beginPath();ctx.moveTo(-w,yb);ctx.lineTo(w,yb);ctx.stroke();
  });
  ctx.globalAlpha=1;ctx.lineWidth=0.6;ctx.strokeStyle=cCy;
  arch(0,18,11,14);arch(-12,22,4.5,8);arch(12,22,4.5,8);
  arch(-6.5,5,7,12);arch(6.5,5,7,12);arch(0,-7,12,13);
  arch(-7,-18,6.5,11);arch(7,-18,6.5,11);arch(0,-28,11,11);
  arch(-6.5,-38,6,10);arch(6.5,-38,6,10);arch(0,-46,8,7);
  ctx.shadowColor='#7b2fff';ctx.shadowBlur=3;ctx.fillStyle=cVi;
  for(let r2=0;r2<2;r2++)for(let c2=0;c2<5;c2++){
    const sx=-13.5+c2*5.4,sy=-55+r2*4.6;
    ctx.beginPath();ctx.moveTo(sx+2.5,sy);ctx.lineTo(sx+5,sy+2.5);
    ctx.lineTo(sx+2.5,sy+5);ctx.lineTo(sx,sy+2.5);ctx.closePath();ctx.fill();
  }
  ctx.shadowColor=cCy;ctx.shadowBlur=4;ctx.fillStyle=cS;
  for(let mi=-14;mi<=14;mi+=3.8)ctx.fillRect(mi,-60,2.3,4);
  ctx.fillRect(-18,-59,36,3);ctx.strokeRect(-18,-59,36,3);
  ctx.shadowBlur=glow;ctx.fillStyle=cM;
  ctx.fillRect(-14,-74,28,15);ctx.strokeRect(-14,-74,28,15);
  ctx.fillStyle=cS;ctx.fillRect(-22,-68,8,9);ctx.strokeRect(-22,-68,8,9);
  ctx.fillRect(14,-68,8,9);ctx.strokeRect(14,-68,8,9);
  ctx.strokeStyle=cCy;ctx.lineWidth=0.38;
  for(let bi=0;bi<3;bi++){ctx.beginPath();ctx.moveTo(-22,-67+bi*3);ctx.lineTo(-14,-67+bi*3);ctx.stroke();
    ctx.beginPath();ctx.moveTo(14,-67+bi*3);ctx.lineTo(22,-67+bi*3);ctx.stroke();}
  ctx.lineWidth=0.6;arch(-7,-73,8,13);arch(7,-73,8,13);
  ctx.fillStyle=cS;ctx.fillRect(-15,-76,3,16);ctx.fillRect(12,-76,3,16);
  ctx.fillRect(-16,-77,30,2);ctx.strokeRect(-16,-77,30,2);
  ctx.shadowBlur=glow;ctx.fillStyle=cM;ctx.fillRect(-12,-86,24,9);ctx.strokeRect(-12,-86,24,9);
  arch(0,-85,9.5,8);arch(-8,-83,3.5,5);arch(8,-83,3.5,5);
  ctx.fillStyle=cS;ctx.fillRect(-13,-87,26,2);ctx.fillRect(-14,-87,3,9);ctx.fillRect(11,-87,3,9);
  ctx.shadowBlur=glow;ctx.fillStyle=cM;ctx.fillRect(-10,-105,20,18);ctx.strokeRect(-10,-105,20,18);
  arch(0,-104,9,16);
  ctx.fillStyle=cS;ctx.shadowBlur=glow;
  ctx.fillRect(-21,-108,8,22);ctx.strokeRect(-21,-108,8,22);
  ctx.fillRect(-23,-109,12,2);
  ctx.beginPath();ctx.moveTo(-17,-113);ctx.lineTo(-21,-109);ctx.lineTo(-13,-109);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.arc(-17,-114.5,2.2,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillRect(-26,-105,4,15);ctx.fillRect(-27,-106,6,2);
  ctx.beginPath();ctx.moveTo(-24,-108);ctx.lineTo(-26,-106);ctx.lineTo(-22,-106);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.arc(-24,-109,1.6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=cVi;ctx.shadowColor='#7b2fff';ctx.shadowBlur=5;
  ctx.beginPath();ctx.arc(-17,-116,1.5,0,Math.PI*2);ctx.fill();
  ctx.shadowColor=cCy;ctx.fillStyle=cS;ctx.shadowBlur=glow;
  ctx.fillRect(13,-108,8,22);ctx.strokeRect(13,-108,8,22);ctx.fillRect(11,-109,12,2);
  ctx.beginPath();ctx.moveTo(17,-113);ctx.lineTo(13,-109);ctx.lineTo(21,-109);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.arc(17,-114.5,2.2,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillRect(22,-105,4,15);ctx.fillRect(21,-106,6,2);
  ctx.beginPath();ctx.moveTo(24,-108);ctx.lineTo(22,-106);ctx.lineTo(26,-106);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.arc(24,-109,1.6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=cVi;ctx.shadowColor='#7b2fff';ctx.shadowBlur=5;
  ctx.beginPath();ctx.arc(17,-116,1.5,0,Math.PI*2);ctx.fill();
  ctx.shadowColor=cCy;ctx.fillStyle=cS;ctx.shadowBlur=3;ctx.fillRect(-11,-107,22,2);
  ctx.shadowBlur=glow;ctx.fillStyle=cM;ctx.fillRect(-9,-117,18,12);ctx.strokeRect(-9,-117,18,12);
  arch(0,-116,7.5,10);arch(-6,-113,3,5);arch(6,-113,3,5);
  ctx.fillStyle=cS;ctx.fillRect(-13,-117,3,12);ctx.strokeRect(-13,-117,3,12);
  ctx.fillRect(10,-117,3,12);ctx.strokeRect(10,-117,3,12);
  ctx.fillRect(-13.5,-118,4.5,1.5);ctx.fillRect(9.5,-118,4.5,1.5);
  ctx.beginPath();ctx.arc(-11.5,-119,1.4,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(11.5,-119,1.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=cS;ctx.shadowBlur=3;ctx.fillRect(-10,-119,20,2);
  ctx.shadowBlur=glow;ctx.fillStyle=cM;ctx.fillRect(-7,-127,14,8);ctx.strokeRect(-7,-127,14,8);
  arch(0,-126,6,7);arch(-4.5,-123,2.5,4);arch(4.5,-123,2.5,4);
  ctx.fillStyle=cS;ctx.shadowBlur=4;ctx.fillRect(-8,-129,16,2);
  ctx.shadowBlur=glow;ctx.fillStyle=cM;
  ctx.beginPath();ctx.arc(0,-132,6,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;
  [0,90,180,270].forEach(deg=>{const rad=deg*Math.PI/180;ctx.fillStyle=cV;
    ctx.beginPath();ctx.arc(Math.cos(rad)*4,Math.sin(rad)*4-132,0.9,0,Math.PI*2);ctx.fill();});
  ctx.shadowBlur=glow;ctx.fillStyle=cS;
  ctx.fillRect(-10,-131,2.5,5);ctx.fillRect(7.5,-131,2.5,5);
  ctx.beginPath();ctx.arc(-8.8,-132,1.4,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(8.8,-132,1.4,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=glow;ctx.fillStyle='rgba(210,228,255,.98)';
  ctx.fillRect(-3.5,-136,7,4);ctx.strokeRect(-3.5,-136,7,4);
  ctx.beginPath();ctx.arc(0,-140,5.2,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillRect(-2.5,-146,5,4);ctx.strokeRect(-2.5,-146,5,4);
  ctx.beginPath();ctx.arc(0,-147,2.8,Math.PI,0);ctx.fill();ctx.stroke();
  ctx.shadowColor='rgba(180,220,255,0.85)';ctx.shadowBlur=9+fl*18;
  ctx.fillStyle=cSv;ctx.strokeStyle='rgba(185,215,255,0.55)';ctx.lineWidth=0.9;
  ctx.fillRect(-1.2,-151,2.4,6);
  ctx.beginPath();ctx.arc(0,-154,2.5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(-2.2,-151);ctx.lineTo(-3,-145);ctx.lineTo(3,-145);ctx.lineTo(2.2,-151);ctx.fill();
  ctx.fillStyle='rgba(195,215,255,0.65)';
  ctx.beginPath();ctx.moveTo(-2.2,-151);ctx.quadraticCurveTo(-8,-155,-6,-148);ctx.lineTo(-3,-149);ctx.fill();
  ctx.beginPath();ctx.moveTo(2.2,-151);ctx.quadraticCurveTo(8,-155,6,-148);ctx.lineTo(3,-149);ctx.fill();
  ctx.strokeStyle='rgba(185,215,255,0.45)';ctx.lineWidth=0.9;
  ctx.beginPath();ctx.moveTo(2.5,-152);ctx.lineTo(7,-162);ctx.stroke();
  ctx.fillStyle='rgba(175,210,255,0.45)';
  ctx.beginPath();ctx.ellipse(5,-160,1.5,3,Math.PI/4,0,Math.PI*2);ctx.fill();
  if(fl>0){
    ctx.save();ctx.shadowColor='#fff';ctx.shadowBlur=52*fl;
    for(let r=12;r<90;r+=15){ctx.strokeStyle=`rgba(0,240,255,${fl*(1-r/96)})`;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(0,-70,r,0,Math.PI*2);ctx.stroke();}
    const fg=ctx.createRadialGradient(0,-70,0,0,-70,60*fl);
    fg.addColorStop(0,`rgba(255,255,255,${fl*.82})`);
    fg.addColorStop(.5,`rgba(0,240,255,${fl*.3})`);fg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.beginPath();ctx.arc(0,-70,60*fl,0,Math.PI*2);ctx.fillStyle=fg;ctx.fill();ctx.restore();
  }
  ctx.restore();
}

/* Background particles */
function initBg(){
  const cvs=document.getElementById('dbg');
  if (!cvs) return;
  const ctx=cvs.getContext('2d');
  function rsz(){cvs.width=window.innerWidth;cvs.height=Math.max(document.getElementById('pd').scrollHeight||0,window.innerHeight);}
  rsz();window.addEventListener('resize',rsz);
  const ps=Array.from({length:30},()=>({x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight,
    vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.18,sz:Math.random()*.85+.22,
    c:['#00f0ff','#ff00e5','#7b2fff','#00ffc8'][Math.floor(Math.random()*4)]}));
  function al(){ctx.fillStyle='rgba(3,5,15,.04)';ctx.fillRect(0,0,cvs.width,cvs.height);
    ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>cvs.width)p.vx*=-1;if(p.y<0||p.y>cvs.height)p.vy*=-1;
      ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);ctx.fillStyle=p.c;ctx.fill();});
    requestAnimationFrame(al);}al();
}

let gridOn=false;
function initDGrid(){
  const cvs=document.getElementById('dgrd');
  if (!cvs) return;
  const ctx=cvs.getContext('2d');
  function rsz(){cvs.width=window.innerWidth;cvs.height=window.innerHeight;}
  rsz();window.addEventListener('resize',rsz);
  let gt=0,mx=window.innerWidth/2,my=window.innerHeight/2;
  document.getElementById('pd').addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
  function al(){ctx.clearRect(0,0,cvs.width,cvs.height);
    if(gridOn){
      const sp=32,cols=Math.ceil(cvs.width/sp)+2,rows=Math.ceil(cvs.height/sp)+2,DR=145,DS=.44;
      for(let i=0;i<=cols;i++){const bx=i*sp-sp;ctx.beginPath();
        for(let j=0;j<=rows;j++){const by=j*sp-sp;let x=bx;
          const dx=bx-mx,dy=by-my,d=Math.sqrt(dx*dx+dy*dy);
          if(d<DR&&d>0){const f=(1-d/DR)*DS,a=Math.atan2(dy,dx);x+=Math.cos(a)*f*20;}
          x+=Math.sin(by*.04+gt*.018)*2;if(j===0)ctx.moveTo(x,by);else ctx.lineTo(x,by);}
        ctx.strokeStyle='rgba(0,240,255,.09)';ctx.lineWidth=.5;ctx.stroke();}
      for(let j=0;j<=rows;j++){const by=j*sp-sp;ctx.beginPath();
        for(let i=0;i<=cols;i++){const bx=i*sp-sp;let y=by;
          const dx=bx-mx,dy=by-my,d=Math.sqrt(dx*dx+dy*dy);
          if(d<DR&&d>0){const f=(1-d/DR)*DS,a=Math.atan2(dy,dx);y+=Math.sin(a)*f*20;}
          y+=Math.sin(bx*.04+gt*.013)*2;if(i===0)ctx.moveTo(bx,y);else ctx.lineTo(bx,y);}
        ctx.strokeStyle='rgba(123,47,255,.07)';ctx.lineWidth=.5;ctx.stroke();}gt++;}
    requestAnimationFrame(al);}al();
  document.getElementById('gbt').addEventListener('click',()=>{
    gridOn=!gridOn;
    document.getElementById('dgrd').classList.toggle('vis',gridOn);
    document.getElementById('gbt').classList.toggle('on',gridOn);
  });
}

/* ================================================================
   MODULE: ISA Simulation & Data Service (preserved exactly)
   ================================================================ */
function computeSolarGeometry(lat_deg, lon_deg, date) {
  const doy = Math.floor((date - new Date(date.getFullYear(),0,0)) / 86400000);
  const B = 2 * Math.PI * (doy - 1) / 365;
  const decl = 0.006918 - 0.399912*Math.cos(B) + 0.070257*Math.sin(B)
             - 0.006758*Math.cos(2*B) + 0.000907*Math.sin(2*B)
             - 0.002697*Math.cos(3*B) + 0.001480*Math.sin(3*B);
  const EqT = 229.18 * (0.000075 + 0.001868*Math.cos(B) - 0.032077*Math.sin(B)
            - 0.014615*Math.cos(2*B) - 0.04089*Math.sin(2*B));
  const UTC_h = date.getUTCHours() + date.getUTCMinutes()/60;
  const solar_h = UTC_h + lon_deg/15 + EqT/60;
  const hour_angle = (solar_h - 12) * 15 * Math.PI / 180;
  const lat = lat_deg * Math.PI / 180;
  const sinElev = Math.sin(lat)*Math.sin(decl) + Math.cos(lat)*Math.cos(decl)*Math.cos(hour_angle);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElev)));
  const zenith_deg = 90 - elevation*180/Math.PI;
  let AM = 999;
  if(sinElev > 0.001) {
    AM = 1 / (sinElev + 0.50572 * Math.pow(96.07995 - zenith_deg, -1.6364));
  }
  let GHI = 0;
  if(sinElev > 0) {
    const tau_b = 0.56 * (Math.exp(-0.65*Math.min(AM,30)) + Math.exp(-0.095*Math.min(AM,30)));
    GHI = PH.S0 * tau_b * sinElev;
  }
  return { elevation_deg: elevation*180/Math.PI, zenith_deg, hour_angle, decl, AM, GHI, sinElev };
}

function runISA() {
  const now = new Date();
  const m = now.getMonth();
  const H_UTC = now.getUTCHours() + now.getUTCMinutes()/60;
  const T_mean_clim = [11.0,13.0,15.5,18.0,22.5,27.5,30.5,30.5,26.5,21.0,15.0,12.0];
  const T_range_clim = [ 9.5,10.5,12.0,13.5,15.0,15.5,14.5,14.5,13.0,11.5, 9.5, 8.5];
  const RH_mean_clim = [78,  73,  66,  64,  60,  46,  38,  40,  52,  62,  72,  78];
  const Td_mean_clim = [ 7.3, 7.8, 8.0, 9.0,10.5,11.0,12.2,13.1,13.8,11.6, 9.5, 8.1];
  const H_local = (H_UTC + 1) % 24;
  const T = T_mean_clim[m] + (T_range_clim[m]/2) * Math.cos(2*Math.PI*(H_local - 14)/24);
  const Td = Td_mean_clim[m] + (T_range_clim[m]*0.2) * Math.cos(2*Math.PI*(H_local - 16)/24);
  const e_s = 6.1078 * Math.exp(17.269 * T / (237.29 + T));
  const e_a_dew = 6.1078 * Math.exp(17.269 * Td / (237.29 + Td));
  const RH = Math.max(10, Math.min(99, 100 * e_a_dew / e_s));
  const P_ISA = PH.P0/100 * Math.pow(1 - PH.L*CFG.altitude/PH.T0, PH.g*PH.Ma/(PH.R*PH.L));
  const P = P_ISA + 1.4*Math.sin(2*Math.PI*(H_local-10)/12) + 0.6*Math.sin(2*Math.PI*(H_local-22)/12);
  const ws_clim = [3.8,4.2,4.5,4.8,4.5,4.0,3.8,3.5,3.8,4.0,3.8,3.8][m];
  const ws = ws_clim * (1 + 0.35 * Math.max(0, Math.cos(2*Math.PI*(H_local-14)/24)));
  const solar = computeSolarGeometry(CFG.lat, CFG.lon, now);
  const S_in = Math.max(0, solar.GHI);
  const physics = physCore.compute(T, RH, P, ws, S_in, 'urban');
  const quantum = qEncoder.encode(physics);
  ATMOS.T=parseFloat(T.toFixed(1));ATMOS.P=parseFloat(P.toFixed(1));
  ATMOS.RH=parseFloat(RH.toFixed(1));ATMOS.ws=parseFloat(ws.toFixed(1));
  ATMOS.S_in=S_in;ATMOS.physics=physics;ATMOS.quantum=quantum;
  ATMOS.confidence=1;ATMOS.agreement='ISA determinista';ATMOS.src='NOAA ISA + AEMET climatologia';
  updateAllDisplays(null, 'NOAA ISA');
  setTimeout(runISA, CFG.wxInterval);
}

async function loadAll() {
  let lat=CFG.lat,lon=CFG.lon;
  await new Promise(res=>{
    if(navigator.geolocation)
      navigator.geolocation.getCurrentPosition(p=>{lat=p.coords.latitude;lon=p.coords.longitude;res();},()=>res(),{timeout:4000});
    else res();
  });

  const urlOM=`<https://api.open-meteo.com/v1/forecast?latitude=&longitude=>`+
    `&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,`+
    `shortwave_radiation,direct_radiation,weather_code`+
    `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,shortwave_radiation`+
    `&timezone=auto&forecast_days=2`;

  const now=new Date(),yest=new Date(now-86400000);
  const fmt=d=>d.toISOString().slice(0,10).replace(/-/g,'');
  const urlNP=`<https://power.larc.nasa.gov/api/temporal/daily/point>`+
    `?parameters=T2M,RH2M,PS,WS10M,ALLSKY_SFC_SW_DWN`+
    `&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}`+
    `&start=${fmt(yest)}&end=${fmt(yest)}&format=JSON&user=manolit_qce`;

  const [rOM,rNP] = await Promise.allSettled([fetch(urlOM),fetch(urlNP)]);

  let omData=null,npData=null;

  if(rOM.status==='fulfilled'){
    const d=await rOM.value.json();
    const cur=d.current;
    omData={
      T:cur.temperature_2m, RH:cur.relative_humidity_2m,
      P:cur.surface_pressure, ws:cur.wind_speed_10m,
      S_in:cur.shortwave_radiation??0,
      hourly:d.hourly,
    };
  }

  if(rNP.status==='fulfilled'){
    try{
      const d=await rNP.value.json();
      const params=d.properties?.parameter;
      const day=fmt(yest);
      npData={
        T:params?.T2M?.[day]??null,
        RH:params?.RH2M?.[day]??null,
        P:(params?.PS?.[day]??null)*10,
        ws:params?.WS10M?.[day]??null,
        S_in:params?.ALLSKY_SFC_SW_DWN?.[day]??null,
      };
    }catch(_){}
  }

  if(!omData){runISA();return;}

  let T_best=omData.T,RH_best=omData.RH,P_best=omData.P,ws_best=omData.ws;
  let S_best=omData.S_in,confidence=1,agreement='Solo Open-Meteo',uncertainty=0;

  if(npData&&npData.T!==null){
    const Td=Math.abs(omData.T-npData.T);
    const RHd=Math.abs(omData.RH-npData.RH);
    confidence=Math.max(0,1-Td/5-RHd/30);
    uncertainty=Td*0.5;
    T_best=0.60*omData.T+0.40*npData.T;
    RH_best=0.60*omData.RH+0.40*npData.RH;
    if(npData.S_in!==null)S_best=0.60*omData.S_in+0.40*npData.S_in;
    agreement=confidence>0.85?'Excelente':confidence>0.65?'Bueno':confidence>0.4?'Moderado':'Bajo';
  }

  const solar=computeSolarGeometry(lat,lon,now);
  const S_phys=Math.max(S_best,solar.GHI*0.7);

  const physics=physCore.compute(T_best,RH_best,P_best,ws_best,S_phys,'urban');
  const quantum=qEncoder.encode(physics);

  ATMOS.T=parseFloat(T_best.toFixed(1));ATMOS.P=parseFloat(P_best.toFixed(1));
  ATMOS.RH=parseFloat(RH_best.toFixed(1));ATMOS.ws=parseFloat(ws_best.toFixed(1));
  ATMOS.S_in=S_phys;ATMOS.physics=physics;ATMOS.quantum=quantum;
  ATMOS.confidence=confidence;ATMOS.agreement=agreement;ATMOS.uncertainty=uncertainty;
  ATMOS.src='Open-Meteo + NASA POWER (cruzado)';ATMOS.npData=npData;

  updateAllDisplays(omData.hourly, ATMOS.src);

  if(CFG.AEMET_KEY!=='TU_API_KEY_AEMET')
    fetch(`<https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/${CFG.AEMET_MUN}?api_key=${CFG.AEMET_KEY}>`)
      .then(r=>r.json()).then(m=>{if(m.datos)console.info('[AEMET]',m.datos);})
      .catch(e=>console.warn('[AEMET CORS]',e.message));

  setTimeout(()=>loadAll().catch(()=>{}),CFG.wxInterval);
  loadISS();loadSW();
}

/* ================================================================
   Display Updates
   ================================================================ */
function updateAllDisplays(hourly, src) {
  const ph=ATMOS.physics;const qu=ATMOS.quantum;

  const sv=(id,v)=>{const e=document.getElementById(id);if(e)e.innerHTML=v};
  if(ph) updatePhysicsPanel(ph);
  renderPhysicsFooter();

  sv('vt',`${ATMOS.T}<span class="du">&#xB0;C</span>`);
  sv('vw',`${ATMOS.ws.toFixed(1)}<span class="du">km/h</span>`);
  sv('vh',`${ATMOS.RH}<span class="du">%</span>`);
  sv('vp',`${ATMOS.P.toFixed(1)}<span class="du">hPa</span>`);
  const winfo=document.getElementById('wxinfo');if(winfo)winfo.textContent=``;
  const wsrce=document.getElementById('wsrc');if(wsrce)wsrce.textContent=ATMOS.npData?'OM + NASA POWER':'Open-Meteo';

  if(hourly)drawWxSpark(hourly.temperature_2m?.slice(0,24)||[]);
  if(hourly)updateFcChart(hourly);
  if(qu)updateQuantumDisplay(ph,qu);
  if(ATMOS.physics)updateMapUHI();
}

function updateQuantumDisplay(ph, qu){
  ph = ph || ATMOS.physics; qu = qu || ATMOS.quantum;
  if(!ph||!qu) return;

  if(sciMode) renderScientistView(ph,qu); else renderCitizenCards(ph,qu);
  renderQCIGauge(qu);
}

function renderScientistView(ph,qu){
  const featureLabels=['T_sup ','T_aire','Hum % ','Viento','S_in  ','R_net '];
  const physVals=[ph.T_surface,ph.T_air,ph.RH,ph.ws,ph.S_in,ph.R_net];
  let circuit='CIRCUITO QPU — Angle Feature Map  [i18next: '+i18next.language+']\n';
  circuit+='━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  qu.features.forEach((f,i)=>{
    const theta=qu.thetas[i].toFixed(4);
    const Ez=qu.E_final[i].toFixed(4);
    let cnots='';
    for(let k=0;k<6;k++){cnots+=k===i-1?'─●─':k===i?'─⊕─':'───';}
    circuit+=`|0> ─Ry() <Z>=${Ez.padStart(7)} | ${featureLabels[i]}=${physVals[i].toFixed(1)}
`;
  });
  circuit+='━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  circuit+=`QCI compuesto (qubit 6): ${qu.QCI_composite.toFixed(2)} / 100  |  Fuente: ${ATMOS.src}`;
  const pre=document.getElementById('qcircuit-pre');
  if(pre) pre.textContent=circuit;

  const blochLabels=['T sup','T aire','Hum','Viento','S_in','R_net'];
  const grid=document.getElementById('bloch-grid');
  if(grid) grid.innerHTML=qu.features.map((f,i)=>{
    const theta=qu.thetas[i];
    const Ez=qu.E_final[i];
    const p0pct=(qu.probs[i].p0*100).toFixed(0);
    const col=Ez>0.33?CFG.T:Ez>-0.33?CFG.G:CFG.M;
    return `<div class="bloch-cell">
      <div class="bloch-lbl">${blochLabels[i]}</div>
      <div class="bloch-theta">&#x3B8;=${theta.toFixed(4)} rad</div>
      <div class="bloch-bar-bg"><div class="bloch-p0" style="width:%"></div></div>
      <div style="font-size:.42rem;color:rgba(180,210,255,.45)">P(|0&#x27E9;)=%</div>
      <div class="bloch-ez" style="color:">&#x27E8;Z&#x27E9;=${(Ez>=0?'+':'')+Ez.toFixed(3)}</div>
    </div>`;
  }).join('');
}

function renderQCIGauge(qu){
  const qcib=document.getElementById('qcib');
  if(qcib) qcib.style.width=qu.QCI_composite.toFixed(0)+'%';
  const qcil=document.getElementById('qcil');
  if(qcil) qcil.textContent=`${t('qciLabel')} — ${qu.QCI_composite.toFixed(1)} / 100`;
  if(radarChart){radarChart.data.datasets[0].data=qu.QCI_individual;radarChart.update('none');}
}

function updatePhysicsPanel(ph){
  const sv=(id,v)=>{const e=document.getElementById(id);if(e)e.innerHTML=v};
  sv('vts',`${ph.T_surface.toFixed(1)}<span class="du">&#xB0;C</span>`);
  sv('vta',`${ph.T_air.toFixed(1)}<span class="du">&#xB0;C</span>`);
  sv('vtv',`${ph.T_virtual.toFixed(1)}<span class="du">&#xB0;C</span>`);
  sv('valb',ph.alpha.toFixed(3));
  sv('vsin',`${ph.S_in.toFixed(0)}<span class="du">W/m&#xB2;</span>`);
  sv('vrnet',`${ph.R_net.toFixed(0)}<span class="du">W/m&#xB2;</span>`);
  sv('vldown',`${ph.L_down.toFixed(0)}<span class="du">W/m&#xB2;</span>`);
  sv('veps',ph.eps_atm.toFixed(4));
  const cl=ATMOS.confidence>0.85?'dq-hi':ATMOS.confidence>0.5?'dq-md':'dq-lo';
  sv('dq-badge',`<span class="dqb ">Acuerdo: ${ATMOS.agreement} (${(ATMOS.confidence*100).toFixed(0)}%)</span>`+
    (ATMOS.npData?`<span class="ci" style="display:inline-block;margin-left:6px">&#177;${ATMOS.uncertainty.toFixed(1)}&#xB0;C | NASA: ${ATMOS.npData.T?.toFixed(1)||'--'}&#xB0;C</span>`:''));
}

function drawWxSpark(temps){
  if(!temps.length)return;
  const cvs=document.getElementById('chw');if(!cvs)return;
  const ctx=cvs.getContext('2d');cvs.width=cvs.offsetWidth||300;cvs.height=62;
  const W=cvs.width,H=cvs.height,Pd=8;
  const mx=Math.max(...temps),mn=Math.min(...temps),rng=mx-mn||1;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='rgba(0,240,255,.025)';for(let y=0;y<H;y+=4)ctx.fillRect(0,y,W,2);
  const gr=ctx.createLinearGradient(0,0,W,0);gr.addColorStop(0,CFG.C);gr.addColorStop(.5,CFG.V);gr.addColorStop(1,CFG.M);
  ctx.strokeStyle=gr;ctx.lineWidth=2;ctx.shadowBlur=8;ctx.shadowColor=CFG.C;
  ctx.beginPath();temps.forEach((v,i)=>{const x=Pd+(i/23)*(W-Pd*2),y=H-Pd-((v-mn)/rng)*(H-Pd*2);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();ctx.shadowBlur=0;
  const fg=ctx.createLinearGradient(0,0,0,H);fg.addColorStop(0,'rgba(0,240,255,.22)');fg.addColorStop(1,'rgba(0,240,255,0)');
  temps.forEach((v,i)=>{const x=Pd+(i/23)*(W-Pd*2),y=H-Pd-((v-mn)/rng)*(H-Pd*2);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
  ctx.lineTo(W-Pd,H-Pd);ctx.lineTo(Pd,H-Pd);ctx.closePath();ctx.fillStyle=fg;ctx.fill();
}

/* ================================================================
   ISS + NOAA SWPC
   ================================================================ */
async function loadISS(){
  async function fi(){
    try{const r=await fetch('https://api.wheretheiss.at/v1/satellites/25544');const d=await r.json();
      const s=(id,v)=>{const e=document.getElementById(id);if(e)e.innerHTML=v};
      s('ilat',d.latitude.toFixed(2)+'&deg;');s('ilon',d.longitude.toFixed(2)+'&deg;');
      s('ialt',`${Math.round(d.altitude)}<span class="du">km</span>`);
      s('ivel',`${Math.round(d.velocity)}<span class="du">km/h</span>`);
      drawISSTrack(d.latitude,d.longitude);}catch(_){}
  }
  fi();setInterval(fi,CFG.issInterval);
}
function showOffISS(){const s=(id,v)=>{const e=document.getElementById(id);if(e)e.innerHTML=v};
  s('ilat','--&deg;');s('ilon','--&deg;');
  s('ialt','~408<span class="du">km</span>');s('ivel','~27574<span class="du">km/h</span>');}
function drawISSTrack(lat,lon){
  const cvs=document.getElementById('isst');if(!cvs)return;
  const ctx=cvs.getContext('2d');cvs.width=cvs.offsetWidth||300;cvs.height=68;
  const W=cvs.width,H=cvs.height;
  ctx.fillStyle='rgba(0,20,50,.55)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(30,80,100,.5)';
  [[.27,.45,.07,.35],[.53,.55,.06,.3],[.52,.3,.04,.12],[.7,.35,.12,.25],[.8,.65,.04,.12]]
    .forEach(([cx,cy,rx,ry])=>{ctx.beginPath();ctx.ellipse(W*cx,H*cy,W*rx,H*ry,0,0,Math.PI*2);ctx.fill();});
  ctx.strokeStyle='rgba(0,240,255,.1)';ctx.lineWidth=.4;
  for(let x=0;x<W;x+=W/6){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=H/3){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  const px=((lon+180)/360)*W,py=((90-lat)/180)*H;
  ctx.strokeStyle='rgba(0,240,255,.2)';ctx.lineWidth=.8;ctx.setLineDash([3,4]);
  ctx.beginPath();for(let i=0;i<=360;i+=5){const a=i*Math.PI/180;
    const ox=((Math.cos(a)*120+lon+180)%360)*(W/360),oy=(Math.sin(a)*51.6+90)*(H/180);
    if(i===0)ctx.moveTo(ox,oy);else ctx.lineTo(ox,oy);}ctx.stroke();ctx.setLineDash([]);
  ctx.shadowColor='#00f0ff';ctx.shadowBlur=14;
  const ig=ctx.createRadialGradient(px,py,0,px,py,10);
  ig.addColorStop(0,'rgba(0,240,255,1)');ig.addColorStop(1,'rgba(0,240,255,0)');
  ctx.beginPath();ctx.arc(px,py,10,0,Math.PI*2);ctx.fillStyle=ig;ctx.fill();
  ctx.shadowBlur=0;ctx.beginPath();ctx.arc(px,py,3,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
}

async function loadSW(){
  try{
    const[kr,fr]=await Promise.all([
      fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'),
      fetch('https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json')]);
    const kd=await kr.json(),fd=await fr.json();
    const kl=kd[kd.length-1],kp=parseFloat(kl?.kp_index||kl?.Kp||kl?.kp||0);
    const fl=fd[fd.length-1],f107=parseFloat(fl?.f10_7obs||0);
    const si=kp<4?0:kp<5?1:kp<6?2:kp<7?3:4;
    const sc=['#00ff88','#ffee00','#ff8800','#ff4400','#ff1100'];
    const sl=['G0 Quieto','G1 Menor','G2 Moderado','G3 Fuerte','G4+ Severo'];
    const rows=[['Indice Kp',`<span style="color:${sc[si]}">${kp.toFixed(1)}</span>`],
      ['Tormenta',`<span style="color:${sc[si]}">${sl[si]}</span>`],
      ['Flujo F10.7',`${f107?f107.toFixed(1):'--'} sfu`],
      ['Obs.',kl?.time_tag||'--']];
    const c=document.getElementById('swc');
    if(c)c.innerHTML=rows.map(r=>`<div class="swr"><span>${r[0]}</span><span class="swv">${r[1]}</span></div>`).join('')+
      `<div class="ci">services.swpc.noaa.gov</div>`;
  }catch(e){const c=document.getElementById('swc');if(c)c.innerHTML=`<div class="ci">NOAA: ${e.message}</div>`;}
}

/* ================================================================
   MODULE: Charts (Chart.js)
   ================================================================ */
let fcChart=null,radarChart=null;
function initCharts(){
  Chart.defaults.color='rgba(180,210,255,.65)';Chart.defaults.borderColor='rgba(0,240,255,.1)';
  const fce=document.getElementById('chfc');
  if(fce){fcChart=new Chart(fce.getContext('2d'),{type:'line',data:{
    labels:Array.from({length:48},(_,i)=>i%6===0?(new Date(Date.now()+i*3600000)).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''),
    datasets:[
      {label:'T (C)',data:[],borderColor:CFG.C,backgroundColor:'rgba(0,240,255,.08)',tension:.4,borderWidth:2,pointRadius:0,fill:true,yAxisID:'y'},
      {label:'Hum (%)',data:[],borderColor:'rgba(123,47,255,.7)',backgroundColor:'rgba(123,47,255,.04)',tension:.4,borderWidth:1.5,pointRadius:0,yAxisID:'y1'},
      {label:'S_in (W/m2)',data:[],borderColor:'rgba(255,215,69,.6)',tension:.3,borderWidth:1,pointRadius:0,borderDash:[4,4],yAxisID:'y2'},
    ]},
    options:{responsive:true,maintainAspectRatio:false,animation:false,
      interaction:{mode:'nearest',intersect:false},
      plugins:{legend:{display:true,labels:{color:'rgba(180,210,255,.6)',font:{size:9},boxWidth:12}}},
      scales:{
        x:{ticks:{color:'rgba(180,210,255,.44)',font:{size:8},maxRotation:0},grid:{color:'rgba(0,240,255,.05)'}},
        y:{ticks:{color:CFG.C,font:{size:8}},grid:{color:'rgba(0,240,255,.05)'}},
        y1:{position:'right',ticks:{color:'rgba(123,47,255,.7)',font:{size:8}},grid:{display:false}},
        y2:{position:'right',display:false},
      }}});}
  const rce=document.getElementById('chqr');
  if(rce){radarChart=new Chart(rce.getContext('2d'),{type:'radar',data:{
    labels:['T sup','T aire','Hum','Viento','S_in','R_net'],
    datasets:[{label:'QCI por qubit',data:[0,0,0,0,0,0],
      borderColor:CFG.C,backgroundColor:'rgba(0,240,255,.1)',
      borderWidth:1.5,pointBackgroundColor:CFG.C,pointRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,animation:{duration:600},
      plugins:{legend:{display:false}},
      scales:{r:{ticks:{color:'rgba(180,210,255,.4)',font:{size:8},backdropColor:'transparent',stepSize:25},
        grid:{color:'rgba(0,240,255,.1)'},pointLabels:{color:'rgba(180,210,255,.6)',font:{size:9}},min:0,max:100}}}});}
}
function updateFcChart(h){
  if(!fcChart||!h)return;
  fcChart.data.datasets[0].data=(h.temperature_2m||[]).slice(0,48);
  fcChart.data.datasets[1].data=(h.relative_humidity_2m||[]).slice(0,48);
  fcChart.data.datasets[2].data=(h.shortwave_radiation||[]).slice(0,48);
  fcChart.update('none');
}

/* ================================================================
   MODULE: Map (Leaflet)
   ================================================================ */
let leafMap=null,uHiLayer=null;
function initMap(){
  const el=document.getElementById('lmap');if(!el||leafMap)return;
  if(typeof L==='undefined'){el.innerHTML='<div class="ci">Leaflet requiere internet</div>';return;}

  leafMap=L.map('lmap',{center:[CFG.lat,CFG.lon],zoom:CFG.mapZoom,preferCanvas:true});

  const layerOSM=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',subdomains:'abc',maxZoom:19});
  const layerDark=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
    attribution:'&copy; OSM &copy; <a href="https://carto.com/">CARTO</a>',subdomains:'abcd',maxZoom:20});
  const layerVoyager=L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    attribution:'&copy; OSM &copy; <a href="https://carto.com/">CARTO</a>',subdomains:'abcd',maxZoom:20});
  const layerEsri=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
    attribution:'&copy; <a href="https://www.esri.com/">Esri</a>, DigitalGlobe, Earthstar Geographics, USGS',maxZoom:19});
  const layerTopo=L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; OSM, SRTM &copy; <a href="https://opentopomap.org/">OpenTopoMap</a>',subdomains:'abc',maxZoom:17});

  layerDark.addTo(leafMap);

  uHiLayer=L.layerGroup();
  addHeatIslands();
  uHiLayer.addTo(leafMap);
  addLandmarks();
  addLegend();

  L.control.layers(
    {'CartoDB Dark':layerDark,'OpenStreetMap':layerOSM,'CartoDB Voyager':layerVoyager,'ESRI Satelite':layerEsri,'Topografico':layerTopo},
    {'Islas de calor UHI':uHiLayer},
    {position:'topright',collapsed:false}
  ).addTo(leafMap);
}

function qUHI(T_air,dens){
  const phUrban=physCore.compute(T_air,ATMOS.RH,ATMOS.P,ATMOS.ws,ATMOS.S_in||200,'urban');
  const surfType=dens<0.25?'vegetation':dens<0.5?'grass':dens<0.75?'asphalt':'urban';
  const phSurf=physCore.compute(T_air,ATMOS.RH,ATMOS.P,ATMOS.ws,ATMOS.S_in||200,surfType);
  const phRef=physCore.compute(T_air,ATMOS.RH,ATMOS.P,ATMOS.ws,ATMOS.S_in||200,'vegetation');
  return {
    T_surface:phSurf.T_surface,
    UHI:(phSurf.T_surface-phRef.T_surface).toFixed(2),
    alpha:phSurf.alpha,
    R_net:phSurf.R_net.toFixed(0),
  };
}

function updateMapUHI(){
  if(!uHiLayer)return;
  uHiLayer.clearLayers();
  addHeatIslands();
}

const HEAT_ZONES=[
  [37.393,-5.990,.88,'Centro Historico'],
  [37.386,-5.979,.80,'Nervion - Alameda'],
  [37.376,-5.970,.75,'Los Remedios'],
  [37.401,-5.998,.72,'Macarena'],
  [37.415,-5.999,.64,'Pino Montano'],
  [37.384,-5.893,.84,'Aeropuerto SVQ'],
  [37.383,-5.970,.79,'San Pablo Este'],
  [37.371,-5.998,.16,'Parque Maria Luisa'],
  [37.380,-6.003,.19,'Parque Alamillo'],
  [37.352,-6.045,.34,'Aljarafe Camas'],
  [37.345,-6.010,.44,'Dos Hermanas'],
  [37.413,-6.001,.56,'Isla Cartuja'],
  [37.360,-5.960,.70,'Alcala acceso'],
  [37.385,-5.971,.86,'Estadio Pizjuan'],
  [37.362,-5.978,.60,'Torreblanca'],
  [37.408,-5.977,.50,'Norte Polestar'],
  [37.392,-6.012,.40,'Triana Este'],
  [37.374,-5.960,.65,'Bellavista'],
];

let heatLayer=null;

function addHeatIslands(){
  if(!uHiLayer)return;
  const T=ATMOS.T||25;

  if(typeof L.heatLayer==='function'){
    const heatPoints=HEAT_ZONES.map(([lat,lon,dens])=>{
      const q=qUHI(T,dens);
      const uhi=parseFloat(q.UHI);
      const intensity=Math.max(.08,Math.min(1,(uhi+1)/5.5));
      return [lat,lon,intensity];
    });
    heatLayer=L.heatLayer(heatPoints,{
      radius:52,
      blur:38,
      maxZoom:17,
      minOpacity:.38,
      gradient:{0.0:'rgba(0,255,140,.75)',0.3:'rgba(180,255,0,.78)',0.55:'rgba(255,221,0,.82)',0.75:'rgba(255,136,0,.85)',1.0:'rgba(255,40,0,.9)'}
    });
    heatLayer.addTo(uHiLayer);
  }

  HEAT_ZONES.forEach(([lat,lon,dens,name])=>{
    const q=qUHI(T,dens);
    const uhi=parseFloat(q.UHI);
    L.circleMarker([lat,lon],{radius:16,color:'transparent',fillColor:'transparent',fillOpacity:0,weight:0,interactive:true})
     .addTo(uHiLayer)
     .bindPopup(`<b></b><br>
       UHI (PhysicsCore): <b>${uhi>0?'+':''}&deg;C</b><br>
       T sup. estimada: <b>${q.T_surface.toFixed(1)}&deg;C</b><br>
       Albedo: ${q.alpha.toFixed(3)} | R_neta: ${q.R_net} W/m&#xB2;<br>
       Densidad urbana: ${Math.round(dens*100)}%<br>
       <span style="font-size:9px;color:rgba(0,200,200,.7)">Stefan-Boltzmann + Brutsaert (1975)</span>`);
  });
}

function addLandmarks(){
  if(!leafMap)return;
  const T=ATMOS.T||25;
  const pts=[
    {lat:37.3861,lon:-5.9928,name:'Giralda & Catedral (s.XII-XVI)',d:.88},
    {lat:37.3826,lon:-5.9962,name:'Torre del Oro (1220)',d:.72},
    {lat:37.3773,lon:-5.9869,name:'Plaza de Espana (1929)',d:.65},
    {lat:37.3714,lon:-5.9956,name:'Parque Maria Luisa',d:.15},
    {lat:37.3880,lon:-6.0022,name:'Puente de Triana',d:.70},
    {lat:37.4193,lon:-5.8931,name:'Aeropuerto SVQ',d:.85},
    {lat:37.3839,lon:-5.9705,name:'Estadio R. Sanchez-Pizjuan',d:.88},
    {lat:37.4131,lon:-6.0013,name:'Isla de la Cartuja (Expo 92)',d:.50},
    {lat:37.3561,lon:-5.9878,name:'Universidad de Sevilla',d:.55},
  ];
  pts.forEach(pt=>{
    const q=qUHI(T,pt.d);const uhi=parseFloat(q.UHI);
    const col=uhi<0?'#00ff88':uhi<2?'#ffee00':uhi<3.5?'#ff8800':'#ff3300';
    const icon=L.divIcon({
      html:`<div style="width:9px;height:9px;border-radius:50%;background:;box-shadow:0 0 8px ;border:1px solid rgba(255,255,255,.32)"></div>`,
      className:'',iconSize:[9,9],iconAnchor:[4,4]});
    L.marker([pt.lat,pt.lon],{icon}).addTo(leafMap)
     .bindPopup(`<b>${pt.name}</b><br>
       UHI: <b>${uhi>0?'+':''}&deg;C</b> | T sup: <b>${q.T_surface.toFixed(1)}&deg;C</b>`);
  });
  L.circleMarker([CFG.lat,CFG.lon],{radius:8,color:'#00f0ff',fillColor:'#00f0ff',fillOpacity:.75,weight:2})
   .addTo(leafMap).bindPopup(`<b>${CFG.city}</b>`);
}

function addLegend(){
  if(!leafMap)return;
  const lg=L.control({position:'bottomleft'});
  lg.onAdd=function(){
    const div=L.DomUtil.create('div','uhi-legend');
    div.innerHTML=`<div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#00f0ff;margin-bottom:6px">UHI (&deg;C)</div>
      ${[['rgba(255,50,0,.82)','+3.5+'],['rgba(255,136,0,.82)','+1.5 a +3.5'],['rgba(255,238,0,.82)','0 a +1.5'],['rgba(0,255,100,.82)','Efecto frio']]
        .map(([c,l])=>`<div style="display:flex;align-items:center;gap:6px;margin:3px 0;font-size:9px"><span style="width:11px;height:11px;border-radius:50%;background:;display:inline-block;flex-shrink:0"></span></div>`).join('')}
      <div style="font-size:8px;color:rgba(0,240,255,.34);margin-top:5px">Stefan-Boltzmann + Brutsaert (1975)</div>`;
    return div;};
  lg.addTo(leafMap);
}

/* ================================================================================================
   MODULE: REAL QUANTUM ENGINE — 4 dedicated dashboard sections (Q1-Q4)
   ================================================================================================ */
let charts = {};
function destroyChart(id){ if(charts[id]){ charts[id].destroy(); delete charts[id]; } }

class QuantumRegister {
  constructor(nQubits) {
    this.n = nQubits;
    const size = 1 << nQubits;
    this.re = new Float64Array(size);
    this.im = new Float64Array(size);
    this.re[0] = 1;
    this.gateLog = [];
  }
  _applySingleQubitGate(target, a_re,a_im,b_re,b_im,c_re,c_im,d_re,d_im) {
    const size = this.re.length;
    const bit = 1 << target;
    for (let i = 0; i < size; i++) {
      if ((i & bit) === 0) {
        const j = i | bit;
        const re0 = this.re[i], im0 = this.im[i];
        const re1 = this.re[j], im1 = this.im[j];
        this.re[i] = (a_re*re0 - a_im*im0) + (b_re*re1 - b_im*im1);
        this.im[i] = (a_re*im0 + a_im*re0) + (b_re*im1 + b_im*re1);
        this.re[j] = (c_re*re0 - c_im*im0) + (d_re*re1 - d_im*im1);
        this.im[j] = (c_re*im0 + c_im*re0) + (d_re*im1 + d_im*re1);
      }
    }
  }
  h(q) {
    const s = Math.SQRT1_2;
    this._applySingleQubitGate(q, s,0, s,0, s,0, -s,0);
    this.gateLog.push({ g: 'H', q });
    return this;
  }
  ry(q, theta) {
    const c = Math.cos(theta/2), s = Math.sin(theta/2);
    this._applySingleQubitGate(q, c,0, -s,0, s,0, c,0);
    this.gateLog.push({ g: 'RY', q, theta });
    return this;
  }
  rz(q, phi) {
    const c = Math.cos(phi/2), s = Math.sin(phi/2);
    this._applySingleQubitGate(q, c,-s, 0,0, 0,0, c,s);
    this.gateLog.push({ g: 'RZ', q, theta: phi });
    return this;
  }
  cnot(control, target) {
    const size = this.re.length;
    const cbit = 1 << control, tbit = 1 << target;
    for (let i = 0; i < size; i++) {
      if ((i & cbit) !== 0 && (i & tbit) === 0) {
        const j = i | tbit;
        const tr = this.re[i], ti = this.im[i];
        this.re[i] = this.re[j]; this.im[i] = this.im[j];
        this.re[j] = tr; this.im[j] = ti;
      }
    }
    this.gateLog.push({ g: 'CNOT', q: control, target });
    return this;
  }
  normCheck() {
    let total = 0;
    for (let i = 0; i < this.re.length; i++) total += this.re[i]*this.re[i] + this.im[i]*this.im[i];
    return total;
  }
  entanglementEntropy(targetQubit = 0) {
    const size = this.re.length;
    const bit = 1 << targetQubit;
    let rho00 = 0, rho11 = 0, rho01_re = 0, rho01_im = 0;
    for (let i = 0; i < size; i++) {
      if ((i & bit) === 0) {
        const j = i | bit;
        const aRe = this.re[i], aIm = this.im[i];
        const bRe = this.re[j], bIm = this.im[j];
        rho00 += aRe*aRe + aIm*aIm;
        rho11 += bRe*bRe + bIm*bIm;
        rho01_re += aRe*bRe + aIm*bIm;
        rho01_im += aIm*bRe - aRe*bIm;
      }
    }
    const trace = rho00 + rho11;
    const det = rho00*rho11 - (rho01_re*rho01_re + rho01_im*rho01_im);
    const disc = Math.max(0, trace*trace - 4*det);
    const sq = Math.sqrt(disc);
    const l1 = (trace + sq) / 2, l2 = (trace - sq) / 2;
    const xlogx = x => (x > 1e-12 ? -x * Math.log2(x) : 0);
    return xlogx(l1) + xlogx(l2);
  }
  measure(shots) {
    const size = this.re.length;
    const probs = new Float64Array(size);
    let total = 0;
    for (let i = 0; i < size; i++) { probs[i] = this.re[i]*this.re[i] + this.im[i]*this.im[i]; total += probs[i]; }
    if (total <= 0) total = 1;
    const cumulative = new Float64Array(size);
    let acc = 0;
    for (let i = 0; i < size; i++) { acc += probs[i] / total; cumulative[i] = acc; }
    const counts = new Uint32Array(size);
    for (let s = 0; s < shots; s++) {
      const r = Math.random();
      let lo = 0, hi = size - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cumulative[mid] < r) lo = mid + 1; else hi = mid; }
      counts[lo]++;
    }
    return { probs, counts, shots, total };
  }
}
function popcount(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }

function runClimateQuantumCircuit(nQubits, shots, targetDayIndex) {
  const daily = ATMOS.dailyForecast;
  if (!daily || !daily.time || daily.time.length === 0) return null;

  const nDays = daily.time.length;
  const target = Math.min(targetDayIndex, nDays - 1);
  const windowStart = Math.max(0, target - nQubits + 1);
  const dayIdxs = [];
  for (let i = 0; i < nQubits; i++) dayIdxs.push(Math.min(windowStart + i, target));

  const maxTemps = daily.temperature_2m_max.filter(v => v !== null && v !== undefined);
  const baseline = maxTemps.length ? maxTemps.reduce((a,b) => a+b, 0) / maxTemps.length : 30;
  const spread = Math.max(3, (Math.max(...maxTemps) - Math.min(...maxTemps)) / 2 || 3);

  const reg = new QuantumRegister(nQubits);
  const encodings = [];

  dayIdxs.forEach((di, q) => {
    const tmax = daily.temperature_2m_max[di];
    const anomaly = (tmax - baseline) / spread;
    const clamped = Math.max(-1, Math.min(1, anomaly));
    const theta = (clamped + 1) / 2 * Math.PI;
    reg.ry(q, theta);
    encodings.push({ q, day: daily.time[di], tmax, theta });
  });

  for (let q = 0; q < nQubits - 1; q++) reg.cnot(q, q + 1);

  dayIdxs.forEach((di, q) => {
    const rain = daily.precipitation_probability_max ? (daily.precipitation_probability_max[di] || 0) : 0;
    const phi = (rain / 100) * Math.PI;
    reg.rz(q, phi);
    reg.h(q);
  });

  const normBefore = reg.normCheck();
  const result = reg.measure(shots);
  const entropy = nQubits > 1 ? reg.entanglementEntropy(0) : 0;

  const weightCounts = new Array(nQubits + 1).fill(0);
  for (let i = 0; i < result.counts.length; i++) {
    if (result.counts[i] > 0) weightCounts[popcount(i)] += result.counts[i];
  }
  const tMin = baseline - spread * 0.6;
  const tMax = baseline + spread * 1.4;
  let bestWeight = 0, bestCount = -1, sumWeighted = 0;
  weightCounts.forEach((c, w) => {
    if (c > bestCount) { bestCount = c; bestWeight = w; }
    sumWeighted += (w / nQubits) * c;
  });
  const meanFrac = sumWeighted / shots;
  const predictedTemp = tMin + meanFrac * (tMax - tMin);
  const confidence = bestCount / shots;

  return {
    nQubits, shots, targetDayIndex: target, dayIdxs, encodings,
    gateLog: reg.gateLog, normBefore, entropy, weightCounts,
    tMin, tMax, predictedTemp, confidence, bestWeight,
    classicalForecast: daily.temperature_2m_max[target],
    classicalDate: daily.time[target]
  };
}

async function fetchDailyForecastForQuantum(){
  const p = {lat:CFG.lat, lon:CFG.lon};
  let lat=p.lat, lon=p.lon;
  const url='https://api.open-meteo.com/v1/forecast'
    +'?latitude='+lat+'&longitude='+lon
    +'&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code'
    +'&timezone=auto&forecast_days=16';
  const res = await fetch(url);
  if(!res.ok) throw new Error('HTTP '+res.status);
  const data = await res.json();
  ATMOS.dailyForecast = data.daily;
  const src = document.getElementById('q-real-src');
  if(src) src.textContent = 'Open-Meteo forecast (real) · '+(data.daily.time?data.daily.time.length:0)+' dias cargados';
  return data.daily;
}

let lastQuantumResult = null;

function updateQuantumControls() {
  const hEl=document.getElementById('q-horizon'), qEl=document.getElementById('q-qubits'), sEl=document.getElementById('q-shots');
  if(!hEl) return;
  hEl.addEventListener('input', () => document.getElementById('q-horizon-val').textContent = hEl.value + (sciMode? ' d' : (' '+ (i18next.language==='en'?'days':'dias'))));
  qEl.addEventListener('input', () => document.getElementById('q-qubits-val').textContent = qEl.value + ' qubits');
  sEl.addEventListener('input', () => document.getElementById('q-shots-val').textContent = Number(sEl.value).toLocaleString('es-ES'));
  hEl.dispatchEvent(new Event('input'));
  qEl.dispatchEvent(new Event('input'));
  sEl.dispatchEvent(new Event('input'));
}

document.getElementById('q-run-btn')?.addEventListener('click', runQuantumSim);

function runQuantumSim() {
  const btn = document.getElementById('q-run-btn');
  if (!ATMOS.dailyForecast) {
    fetchDailyForecastForQuantum().then(()=>runQuantumSim()).catch(()=>{
      const src=document.getElementById('q-real-src'); if(src) src.textContent = t('qNoData');
    });
    return;
  }
  const nQubits = parseInt(document.getElementById('q-qubits').value, 10);
  const shots = parseInt(document.getElementById('q-shots').value, 10);
  const horizon = parseInt(document.getElementById('q-horizon').value, 10);

  btn.disabled = true; btn.textContent = t('qRunning');

  const qubitDisplay = document.getElementById('qubit-display');
  qubitDisplay.innerHTML = Array.from({ length: nQubits }, (_, i) => '<div class="qubit superposition" id="qb-' + i + '">q' + i + '</div>').join('');

  setTimeout(() => {
    const result = runClimateQuantumCircuit(nQubits, shots, horizon);
    if (!result) {
      const src=document.getElementById('q-real-src'); if(src) src.textContent = t('qNoData');
      btn.disabled = false; btn.textContent = t('qRun'); return;
    }
    lastQuantumResult = result;
    renderQuantumResult(result);
    btn.disabled = false; btn.textContent = t('qRun');
    if(ATMOS.quantum) renderQCIGauge(ATMOS.quantum);
  }, 500);
}

function fmtT(v){ return (v===null||v===undefined||isNaN(v)) ? '--' : (Math.round(v*10)/10); }
function fmtDateShort(iso){ if(!iso) return '--'; const d=new Date(iso+'T12:00:00'); return d.toLocaleDateString(i18next.language==='en'?'en-GB':'es-ES',{weekday:'short',day:'numeric',month:'short'}); }

function renderQuantumResult(r) {
  document.getElementById('q-prediction').textContent = fmtT(r.predictedTemp) + '°C';
  document.getElementById('q-confidence').textContent = Math.round(r.confidence * 100) + '%';
  document.getElementById('q-norm').textContent = (r.normBefore * 100).toFixed(3) + '%';
  document.getElementById('q-entanglement').textContent = r.entropy.toFixed(3);
  document.getElementById('q-gates').textContent = r.gateLog.length;

  document.getElementById('qubit-display').innerHTML = r.encodings.map((e, i) =>
    '<div class="qubit active" title="' + e.day + ': ' + fmtT(e.tmax) + '°C">q' + i + '</div>').join('');

  if(sciMode){
    let circuitText = '<span style="color:#8892B0;">// '+r.shots.toLocaleString('es-ES')+' shots — Born rule</span><br>';
    r.encodings.forEach((e, i) => { circuitText += 'q' + i + ': <span style="color:#00ffc8">RY(' + e.theta.toFixed(2) + ')</span> &larr; ' + e.day + ' (' + fmtT(e.tmax) + '°C)<br>'; });
    for (let i = 0; i < r.nQubits - 1; i++) circuitText += 'q' + i + '-q' + (i+1) + ': <span style="color:#7b2fff">CNOT</span><br>';
    circuitText += 'all: <span style="color:#ff00e5">RZ(&phi;_lluvia)</span> &rarr; <span style="color:#00f0ff">H</span><br>';
    circuitText += '<span style="color:#8892B0;">// medicion final (regla de Born)</span>';
    document.getElementById('quantum-circuit').innerHTML = circuitText;
    document.getElementById('q-methodology').textContent =
      `Circuito ejecutado sobre ${r.nQubits} qubits (${r.dayIdxs.length} dias reales de Open-Meteo, desde ${fmtDateShort(r.encodings[0].day)}). `+
      `Referencia clasica para ese dia: ${fmtT(r.classicalForecast)}°C. Rango de medicion cuantica: ${fmtT(r.tMin)}°C - ${fmtT(r.tMax)}°C.`;
  } else {
    document.getElementById('quantum-circuit').innerHTML =
      `Manolit&#8734; ha mezclado <b>${r.nQubits}</b> dias de pronostico real (desde ${fmtDateShort(r.encodings[0].day)}) usando su motor cuantico. `+
      `Repitiendo la medicion <b>${r.shots.toLocaleString('es-ES')}</b> veces, la respuesta mas repetida da una temperatura estimada de <b>${fmtT(r.predictedTemp)}°C</b> `+
      `para el ${fmtDateShort(r.classicalDate)}, con un <b>${Math.round(r.confidence*100)}%</b> de las mediciones de acuerdo entre si. `+
      `El pronostico clasico de Open-Meteo para ese mismo dia es de ${fmtT(r.classicalForecast)}°C — el motor cuantico esta de acuerdo si ambos numeros estan cerca.`;
    document.getElementById('q-methodology').textContent =
      `Cuanto mas alta sea la confianza, mas de acuerdo estuvieron las ${r.shots.toLocaleString('es-ES')} mediciones entre si — como preguntar lo mismo muchas veces y ver cuanto coinciden las respuestas.`;
  }

  const weightLabels = r.weightCounts.map((_, w) => Math.round(r.tMin + (w / r.nQubits) * (r.tMax - r.tMin)) + '°C');
  document.getElementById('prob-bars').innerHTML = r.weightCounts.map((c, w) => {
    const pct = Math.round((c / r.shots) * 100);
    const hue = w === r.bestWeight ? '#00ffc8' : '#00f0ff';
    return '<div class="prob-item"><div class="prob-label">~' + weightLabels[w] + '</div>'
      + '<div class="prob-bar-wrap"><div class="prob-bar-fill" style="width:' + pct + '%;background:' + hue + ';"></div></div>'
      + '<div class="prob-value">' + pct + '%</div></div>';
  }).join('');

  destroyChart('quantumProbChart');
  const ctx1 = document.getElementById('quantumProbChart');
  if(ctx1) charts.quantumProbChart = new Chart(ctx1, { type: 'bar', data: { labels: weightLabels, datasets: [
    { label: sciMode?'Shots medidos':'Veces medido', data: Array.from(r.weightCounts), backgroundColor: r.weightCounts.map((_, w) => w === r.bestWeight ? '#00ffc8' : 'rgba(0,240,255,0.55)') }
  ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
    scales:{ x:{ticks:{color:'rgba(180,210,255,.5)',font:{size:9}}}, y:{ticks:{color:'rgba(180,210,255,.5)',font:{size:9}}} } } });

  renderQuantumVsClassic(r);
}

function renderQuantumVsClassic(r) {
  const d = ATMOS.dailyForecast;
  const ctx = document.getElementById('quantumVsClassicChart');
  if (!ctx || !d) return;
  destroyChart('quantumVsClassicChart');
  const labels = d.time.slice(0, 8).map(fmtDateShort);
  const classical = d.temperature_2m_max.slice(0, 8);
  const quantum = classical.map((v, i) => (i === r.targetDayIndex ? r.predictedTemp : v + (r.predictedTemp - r.classicalForecast) * Math.max(0, 1 - Math.abs(i-r.targetDayIndex) * 0.18)));
  const real = classical.map((v, i) => (i === 0 && ATMOS.T ? ATMOS.T : null));
  charts.quantumVsClassicChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [
    { label: sciMode?'Open-Meteo (clasico)':'Prediccion normal', data: classical, borderColor: '#00f0ff', tension: 0.3, pointRadius: 2 },
    { label: sciMode?'Ponderacion cuantica':'Prediccion de Manolit\u221E', data: quantum.map(v => v && v.toFixed ? v.toFixed(1) : v), borderColor: '#7b2fff', borderDash: [5,3], tension: 0.3, pointRadius: 2 },
    { label: sciMode?'Real (observado ahora)':'Ahora mismo', data: real, borderColor: '#00ffc8', pointRadius: 6, pointBackgroundColor: '#00ffc8', showLine: false }
  ] }, options: { responsive: true, maintainAspectRatio: false,
    plugins:{legend:{labels:{color:'rgba(180,210,255,.6)',font:{size:9},boxWidth:10}}},
    scales:{ x:{ticks:{color:'rgba(180,210,255,.5)',font:{size:9}}}, y:{ticks:{color:'rgba(180,210,255,.5)',font:{size:9}}} } } });
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
    i18next.init({
      lng: 'es',
      fallbackLng: 'es',
      debug: false,
      resources: I18N_RESOURCES,
    }).then(() => {
      applyI18n();
      initThreeScene();
      /* Citizen mode is default on load */
      document.getElementById('sci-view').style.display='none';
      document.getElementById('cit-view').style.display='block';
      const q1e = document.getElementById('q1-explain');
      if(q1e) q1e.innerHTML = t('q1ExplainCitizen');
    });
});