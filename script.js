
document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTra4sQ8-xdHS_3CLItreDQT9IQfvzzugCEFg0WuuWk78fn_SVdQ5geFKKWnKlIkMUvwNPJzRNAkUGU/pub?output=csv';

    // --- ELEMENTOS DEL DOM ---
    const searchButton = document.getElementById('search-button');
    const resetButton = document.getElementById('reset-button');
    const countryInput = document.getElementById('country-search');
    const typeInput = document.getElementById('type-search');
    const modelInput = document.getElementById('model-search');
    const resultsContainer = document.getElementById('results-container');
    const loadingSpinner = document.getElementById('loading');
    const noResultsMessage = document.getElementById('no-results');

    // --- ESTADO DE LA APLICACIÓN ---
    let allData = [];

    /**
     * Parsea texto CSV a un array de objetos.
     * @param {string} csvText - El texto plano del archivo CSV.
     * @returns {Array<Object>} Un array de objetos.
     */
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(value => value.trim());
            if (values.length === headers.length) {
                const entry = {};
                headers.forEach((header, index) => {
                    entry[header] = values[index];
                });
                data.push(entry);
            }
        }
        return data;
    }
    
    /**
     * Obtiene la imagen de Wikipedia para un término de búsqueda.
     * @param {string} searchTerm - El término a buscar (ej: "F-16 Fighting Falcon").
     * @param {HTMLImageElement} imgElement - El elemento <img> donde se mostrará la imagen.
     */
    async function fetchWikipediaImage(searchTerm, imgElement) {
        if (!searchTerm) {
            imgElement.alt = 'No se proporcionó término de búsqueda';
            return;
        }
        
        const API_ENDPOINT = 'https://en.wikipedia.org/w/api.php?origin=*&action=query&format=json';

        try {
            // 1. Buscar la página para obtener el título correcto
            const searchUrl = `${API_ENDPOINT}&list=search&srlimit=1&srsearch=${encodeURIComponent(searchTerm)}`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();
            
            if (!searchData.query.search.length) {
                imgElement.alt = `No se encontró página para "${searchTerm}"`;
                return;
            }
            const pageTitle = searchData.query.search[0].title;

            // 2. Usar el título para obtener la imagen principal
            const imageUrl = `${API_ENDPOINT}&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&pithumbsize=300`;
            const imageRes = await fetch(imageUrl);
            const imageData = await imageRes.json();

            const pages = imageData.query.pages;
            const page = Object.values(pages)[0];

            if (page.thumbnail && page.thumbnail.source) {
                imgElement.src = page.thumbnail.source;
                imgElement.alt = `Imagen de ${pageTitle}`;
            } else {
                imgElement.alt = `No se encontró imagen para "${pageTitle}"`;
            }
        } catch (error) {
            console.error('Error fetching Wikipedia image:', error);
            imgElement.alt = 'Error al cargar imagen';
        }
    }


    /**
     * Muestra los resultados en el contenedor.
     * @param {Array<Object>} data - Un array de objetos a mostrar.
     */
    function displayResults(data) {
        resultsContainer.innerHTML = '';
        if (data.length === 0) {
            noResultsMessage.style.display = 'block';
            return;
        }
        noResultsMessage.style.display = 'none';

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'result-card';

            const name = document.createElement('h2');
            name.textContent = item.Name || 'Sin Nombre';

            const country = document.createElement('span');
            country.className = 'country-tag';
            country.textContent = item.Country || 'País Desconocido';
            
            const wikiImage = document.createElement('img');
            wikiImage.className = 'wiki-image';
            wikiImage.alt = 'Cargando imagen...';
            wikiImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 transparent gif

            const description = document.createElement('p');
            description.innerHTML = `<strong>Descripción:</strong> ${item.Description || 'N/A'}`;

            const type = document.createElement('p');
            type.innerHTML = `<strong>Tipo:</strong> ${item.Type || 'N/A'}`;
            
            const model = document.createElement('p');
            model.innerHTML = `<strong>Modelo:</strong> ${item.Model || 'N/A'}`;

            card.appendChild(name);
            card.appendChild(country);
            card.appendChild(wikiImage);
            card.appendChild(type);
            card.appendChild(model);
            card.appendChild(description);
            resultsContainer.appendChild(card);
            
            // Cargar la imagen de Wikipedia
            fetchWikipediaImage(item.Name, wikiImage);
        });
    }

    /**
     * Filtra los datos según los criterios de búsqueda.
     */
    function filterData() {
        const countryTerm = countryInput.value.toLowerCase();
        const typeTerm = typeInput.value.toLowerCase();
        const modelTerm = modelInput.value.toLowerCase();

        const filtered = allData.filter(item => {
            const countryMatch = item.Country ? item.Country.toLowerCase().includes(countryTerm) : true;
            const typeMatch = item.Type ? item.Type.toLowerCase().includes(typeTerm) : true;
            const modelMatch = (item.Model ? item.Model.toLowerCase().includes(modelTerm) : true) || 
                               (item.Name ? item.Name.toLowerCase().includes(modelTerm) : true);
            return countryMatch && typeMatch && modelMatch;
        });

        displayResults(filtered);
    }
    
    /**
     * Limpia los filtros y muestra todos los datos.
     */
    function resetFilters() {
        countryInput.value = '';
        typeInput.value = '';
        modelInput.value = '';
        displayResults(allData.slice(0, 50)); // Muestra los primeros 50 para no saturar
    }


    /**
     * Función principal para cargar y procesar los datos.
     */
    async function main() {
        loadingSpinner.style.display = 'block';
        try {
            const response = await fetch(SPREADSHEET_URL);
            if (!response.ok) {
                throw new Error(`Error al descargar los datos: ${response.statusText}`);
            }
            const csvText = await response.text();
            allData = parseCSV(csvText);
            displayResults(allData.slice(0, 50)); // Muestra los primeros 50 resultados al cargar
        } catch (error) {
            console.error('Fallo al cargar la base de datos:', error);
            resultsContainer.innerHTML = '<p style="color: red; text-align: center;">No se pudo cargar la base de datos. Verifica la URL y tu conexión.</p>';
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    // --- EVENT LISTENERS ---
    searchButton.addEventListener('click', filterData);
    resetButton.addEventListener('click', resetFilters);
    // Para búsqueda en tiempo real (opcional)
    [countryInput, typeInput, modelInput].forEach(input => {
        input.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                filterData();
            }
        });
    });

    // --- INICIALIZACIÓN ---
    main();
});
