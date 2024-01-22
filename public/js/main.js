let queryResult;
let queryParams;
let tableStructure;
let schema;
let table;
let query;
let isTruncated;
let pluginConfiguration;
const headersToAlignRight = [];
const loaderElement = document.getElementById('loader');
const modal = document.getElementById('modal');

// close the edit columns modal when clicking outside of it
document.querySelector('body').addEventListener('click', () => {
    if (event.target === modal) {
        closeModal();
    }
});
// close the edit columns modal when escape key is pressed
window.onkeyup = (e) => {
    if (
        e.key === 'Escape' && modal.style.visibility === 'visible'
    ) {
        e.preventDefault();
        closeModal();
    }
};

/**
 * make XMLHttpRequest
 * @param verb : string  default value 'GET'
 * @param url : string   API end point
 * @param body : Object
 * @returns {Promise<any>}
 */
function makeRequest(verb = 'GET', url, body) {
    const xmlHttp = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
        xmlHttp.onreadystatechange = () => {
            // Only run if the request is complete
            if (xmlHttp.readyState !== 4) {
                return;
            }
            // Process the response
            if (xmlHttp.status >= 200 && xmlHttp.status < 300) {
                // If successful
                resolve(xmlHttp);
            } else {
                // If failed
                reject({
                    status: xmlHttp.status,
                    statusText: xmlHttp.statusText,
                    body: JSON.parse(xmlHttp.response).body.error
                });
            }
        };
        xmlHttp.open(verb, url);
        xmlHttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xmlHttp.send(JSON.stringify(body));
    });
}

/**
 * Handle request errors
 * @param event : Object
 */
function handleError(event) {
    document.getElementById('error_description').innerText = event.body.message;
    document.getElementById('loading').classList.add('hide');
    document.getElementById('spinner').classList.add('hide');
    document.getElementById('error').classList.remove('hide');
    throw Error(event.body.message);
}

/**
 * set queryResult value
 * @param result : Object
 */
function setQueryResult(result) {
    if (result.status === 200) {
        queryResult = {truncatedByLimit: result.body.truncatedByLimit};
        if (pluginConfiguration.entityType && pluginConfiguration.entityType === 'edge') {
            queryResult.result = result.body.edges.filter(edge => edge.data.type === pluginConfiguration.itemType);
        } else {
            queryResult.result = result.body.nodes.filter(node => node.data.categories.includes(pluginConfiguration.itemType));
        }
    } else {
        handleError(result);
    }
}

/**
 * make a request to run the query
 * @param query : Object query configuration
 * @returns {Promise<void>}
 */
async function runQueryByID(query) {
    try {
        const result = await makeRequest(
            'POST',
            `api/runQueryByIDPlugin`,
            {query, queryParams}
        );
        setQueryResult(JSON.parse(result.response));
    } catch(e) {
        handleError(e);
    }

}

/**
 * set queryParams as a json object containing the query parameters
 */
function parseQueryParams() {
    const url = location.search;
    const query = url.substr(1);
    const result = {global: {}, templateFields: {}};
    query.split('&').forEach((param) => {
        const item = param.split('=');
        const parameter = getParameter(item);
        if (parameter) {
            if (parameter.type === 'global') {
                result.global[decodeURIComponent(parameter.key)] = parameter.value;
            } else if (parameter.type === 'templateField') {
                result.templateFields[decodeURIComponent(parameter.key)] = parameter.value;
            }
        }
    });
    queryParams = result;
}

/**
 * check if the query-param  is allowed
 * @param item
 */
function getParameter(item) {
    const allowedParams = {
        oneOf: [
            'sourceKey',
            'limit',
            'queryId',
            'truncated',
            'queryName'
        ],
        startWith: [
            'param_number_',
            'param_ids_',
            'param_string_'
        ]
    };
    const decodedValue = decodeURIComponent(item[1]);
    if (allowedParams.oneOf.includes(item[0])) {
        return {key: item[0], value: decodedValue, type: 'global'};
    } else {
        const prefix = allowedParams.startWith.find((prefix) => item[0].startsWith(prefix));
        switch (prefix) {
            case  'param_number_':
                return {key: item[0].replace('param_number_', ''), value: +decodedValue, type: 'templateField'};
            case  'param_ids_':
                return {key: item[0].replace('param_ids_', ''), value: decodedValue, type: 'templateField'};
            case  'param_string_':
                return {key: item[0].replace('param_string_', ''), value: decodedValue, type: 'templateField'};
            default:
                return false;
        }
    }
}

/**
 * check if the query template fields are valid
 * @param query
 */
function validateTemplateFieldsParams(query) {
    if (query.templateFields && query.templateFields.length > 0) {
        query.templateFields.forEach(template => {
            if (queryParams.templateFields.hasOwnProperty(template.key)) {
                if (template.type === 'number' && !isFinite(+queryParams.templateFields[template.key])) {
                    return handleError({body: {message: `Invalid URL parameter “${template.key}” (it must be a number)`}});
                }
            } else {
                return handleError({body: {message: `Missing URL parameter “${template.key}”`}});
            }
        });
    }
}

/**
 * validate the global query params : queryID, sourceKey
 * @param params
 * @returns {boolean|void}
 */
function validateGlobalQueryParams(params) {
    if (params.queryId === undefined && params.queryName === undefined) {
        return handleError({body: {message: 'Missing URL parameter: a “queryId” (number) or a “queryName” (string) is mandatory'}});
    } else if (params.queryId !== undefined && params.queryName !== undefined) {
        return handleError({body: {message: 'Only one query parameter is allowed: impossible to use “queryId” and “queryName” at the same moment'}});
    } else if (params.queryId !== undefined && !Number.isInteger(+params.queryId)) {
        return handleError({body: {message: 'URL parameter “queryId” must be a number'}});
    } else if (params.sourceKey === undefined) {
        return handleError({body: {message: 'Missing URL parameter “sourceKey” (must be a string)'}});
    }
    return true;
}

/**
 * set the schema
 * @param result
 */
function setSchema(result) {
    if (result.status === 200) {
        schema = result.body.results;
    } else {
        handleError(result);
    }
}

/**
 * make a request to get the schema
 * @returns {Promise<void>}
 */
async function getSchema() {
    try {
        const result = await makeRequest(
            'GET',
            `api/getSchema?sourceKey=${queryParams.global.sourceKey}`,
            null
        );
        setSchema(JSON.parse(result.response));
    } catch(e) {
        handleError(e);
    }

}

/**
 * make a request to validate the plugin configuration
 * @returns {Promise<boolean>}
 */
async function validatePluginConfiguration() {
    try {
        const result = await makeRequest(
            'POST',
            `api/checkPluginsConfiguration`,
            {results: schema}
        );
        pluginConfiguration = JSON.parse(result.response);
        return true;
    } catch(e) {
        handleError(e);
    }
}

/**
 * check the length of the table text and truncate it if is longer than 38
 * @param cell
 * @returns {string}
 */
function truncateTableText(cell) {
    return truncateText(cell.getValue(), isTruncated ? 38 : Infinity);
}

/**
 * take a string and max length  and truncate the text if it'length is longer
 * @param text : string
 * @param maxLength : number
 * @returns {string}
 */
function truncateText(text = '', maxLength = 50) {
    if (text.length > maxLength) {
        return `${text.slice(0, maxLength - 2)}...`;
    } else {
        return text;
    }
}

/**
 * return the text to show in the tooltip
 * @param cell
 * @returns {string|boolean|*|string}
 */
function getFieldTooltip(cell) {
    if (cell.getValue() && cell.getValue().length > 50) {
        truncateText(cell.getValue(), 300);
    }
    return false;
}

/**
 * filter the schema to include only the configured properties
 * @param schemaStructure
 * @returns {Array}
 */
function getFilteredSchema(schemaStructure) {
    const properties = schemaStructure.find(item => item.itemType === pluginConfiguration.itemType).properties || [];
    let sortedProperties = [];
    if (pluginConfiguration.properties) {
        pluginConfiguration.properties.forEach(propertyName => {
            const property = properties.find(property => property.propertyKey === propertyName);
            if (property) {
                sortedProperties.push(property);
            }
        });
    } else {
        sortedProperties = sortAlphabetically(properties, 'propertyKey');
    }
    return sortedProperties;
}

/**
 * take an array of value or object and sorted alphabetically
 * if it is an object sorted by checking the objKey value
 * @param arr
 * @param objKey
 * @returns {*}
 */
function sortAlphabetically(arr, objKey) {
    return arr.sort((a, b) => {
        const aK = objKey ? a[objKey] : a;
        const bK = objKey ? b[objKey] : b;
        const sanitizedA = typeof aK === 'string' ? aK.toLowerCase() : aK;
        const sanitizedB = typeof bK === 'string' ? bK.toLowerCase() : bK;
        return sanitizedA < sanitizedB ? -1 : sanitizedA > sanitizedB ? 1 : 0;
    });
}

/**
 * return the structure of the table
 * @param schemaStructure
 * @returns {*[]}
 */
function getTableStructure(schemaStructure) {
    const properties = getFilteredSchema(schemaStructure);
    const sanitizedData = properties.map((property, index) => {
        let align = 'left';
        if (
            property.propertyType &&
            (property.propertyType.name === 'number' ||
                property.propertyType.name === 'date' ||
                property.propertyType.name === 'datetime')
        ) {
            align = 'right';
            headersToAlignRight.push(index + 2);
        }
        return {
            title: property.propertyKey,
            field: escapeDotCharacters(property.propertyKey),
            align: align,
            titleFormatter: truncateTableText,
            headerSort: false,
            formatter: truncateTableText,
            tooltip: getFieldTooltip
        };
    });
    return [
        {title: 'row', field: 'row', align: 'center', headerSort: false, frozen: true},
        {title: 'id', field: 'id', align: 'right', headerSort: false},
        ...sanitizedData
    ];
}

/**
 * get the data that will be printed in the table
 * @param queryResult
 * @returns {*}
 */
function getTableData(queryResult) {
    return queryResult.result.map((item, index) => {
        for (let [key, value] of Object.entries(item.data.properties)) {
            if (typeof value === 'object') {
                if (value.value && (value.type === 'date' || value.type === 'datetime')) {
                    item.data.properties[key] = formatDate(value.value, value.type === 'datetime');
                } else {
                    item.data.properties[key] = value.value || value.original;
                }
            }
            // If one of the property key has a . we replace it by the string 'dot' to avoid an error in Tabulator
            if (key.includes('.')) {
                Object.defineProperty(item.data.properties, escapeDotCharacters(key),
                    Object.getOwnPropertyDescriptor(item.data.properties, key));
                delete item.data.properties[key];
            }
        }
        return {...item.data.properties, 'id': item.id, 'row': index + 1};
    });
}

/**
 * format date to readable ISO format
 * @param isoString
 * @param isDatetime
 * @returns {string|null}
 */
function formatDate(isoString, isDatetime) {
    // The date received from the server will be always in seconds
    const dateObject = new Date(isoString);

    if (isNaN(dateObject.getUTCFullYear())) {
        return null;
    }
    let formattedDate =
        dateObject.getFullYear() +
        '-' +
        ((dateObject.getUTCMonth() + 1).toString().length === 1
            ? '0' + (dateObject.getUTCMonth() + 1)
            : dateObject.getUTCMonth() + 1) +
        '-' +
        (dateObject.getUTCDate().toString().length === 1
            ? '0' + dateObject.getUTCDate()
            : dateObject.getUTCDate());

    if (isDatetime) {
        formattedDate +=
            ' ' +
            (dateObject.getUTCHours().toString().length === 1
                ? '0' + dateObject.getUTCHours()
                : dateObject.getUTCHours()) +
            ':' +
            (dateObject.getUTCMinutes().toString().length === 1
                ? '0' + dateObject.getUTCMinutes()
                : dateObject.getUTCMinutes()) +
            ':' +
            (dateObject.getUTCSeconds().toString().length === 1
                ? '0' + dateObject.getUTCSeconds()
                : dateObject.getUTCSeconds());
    }
    return formattedDate;
}

/**
 * return the tooltips of columns header
 * @param column
 * @returns {boolean|*}
 */
function getTooltipsHeader(column) {
    if (column.getDefinition().title && column.getDefinition().title.length * 8 > 300) {
        return column.getDefinition().title;
    }
    return false;
}

/**
 * set the table Header in the view
 */
function setTableHeader() {
    if (queryResult.truncatedByLimit && queryParams.global.limit === undefined) {
        document.getElementById('warning').classList.remove('hide');
    }
    document.getElementById('table_title').innerText = query.name;
    if (pluginConfiguration.entityType === undefined || pluginConfiguration.entityType === 'node') {
        document.getElementById('warning_text').innerText = `The query returned too many results. The ${
            queryResult.result.length} first results are displayed below.`;
        document.getElementById('item_type').innerText = `Node type : ${pluginConfiguration.itemType}`;
        document.getElementById('item_count').innerText = `Number of nodes : ${queryResult.result.length}`;
    } else if (pluginConfiguration.entityType === 'edge') {
        document.getElementById('warning_text').innerText = `The query returned too many results. The ${
            queryResult.result.length} first results are displayed below.`;
        document.getElementById('item_type').innerText = `Edge type : ${pluginConfiguration.itemType}`;
        document.getElementById('item_count').innerText = `Number of edges : ${queryResult.result.length}`;
    }
}

/**
 * filter table columns
 */
function filterTableColumns() {
    const list = document.getElementsByTagName('input');
    for (let i = 0; i < list.length; i++) {
        if (list[i].checked) {
            table.showColumn(escapeDotCharacters(list[i].id));
        } else {
            table.hideColumn(escapeDotCharacters(list[i].id));
        }
    }
    closeModal();
}

/**
 * create a checkbox list with the table columns
 */
function fillModalColumns() {
    document.getElementById('modal_close').addEventListener('click', closeModal);
    const columnsList = table.getColumnDefinitions();
    const selectColumnsElement = document.getElementById('column-list');
    columnsList.forEach(async (column) => {
        if (column.title !== 'row') {
            const columnCheckBoxDiv = document.createElement('div');
            const columnCheckBoxLabel = document.createElement('label');
            const description = document.createTextNode(truncateText(column.title, 38));
            const checkBoxElement = document.createElement('input');
            columnCheckBoxLabel.setAttribute('for', column.title);
            checkBoxElement.setAttribute('type', 'checkbox');
            checkBoxElement.setAttribute('id', column.title);
            checkBoxElement.setAttribute('name', column.title.replace(' ', ''));
            checkBoxElement.style.marginRight = '4px';
            checkBoxElement.checked = true;
            columnCheckBoxLabel.appendChild(description);
            columnCheckBoxDiv.appendChild(checkBoxElement);
            columnCheckBoxDiv.appendChild(columnCheckBoxLabel);
            selectColumnsElement.appendChild(columnCheckBoxDiv);
            columnCheckBoxDiv.classList.add('checkbox-column');
        }
    });
    document.getElementById('cancel').addEventListener('click', closeModal);
    document.getElementById('confirm').addEventListener('click', filterTableColumns);
}

/**
 * close tha edit columns modal
 */
function closeModal() {
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
}

/**
 * open the edit columns modal
 */
function showModal() {
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    const list = document.getElementsByTagName('input');
    for (let i = 0; i < list.length; i++) {
        list[i].checked = table.getColumn(escapeDotCharacters(list[i].id)).getVisibility();
    }
}

/**
 * add the different buttons to the view and init actions
 */
function addButtons() {
    // EXPORT TO CSV BUTTON
    document.getElementById('button-export').addEventListener('click', () => {
        delimiterCharacter = ",";
        if (pluginConfiguration.delimiter){
            delimiterCharacter = pluginConfiguration.delimiter;
        }
        table.download('csv', 'data.csv', {delimiter:delimiterCharacter, bom:true});
    });

    // OPEN EDIT COLUMN MODAL
    document.getElementById('button-edit').addEventListener('click', showModal);

    // HANDLE PAGINATION
    handlePagination();

}

/**
 * handle table pagination actions
 */
function handlePagination() {
    const currentPageButton = document.getElementById('pagination-page');
    currentPageButton.innerText = table.getPage();
    const firstButton = document.getElementById('pagination-first');
    const prevButton = document.getElementById('pagination-prev');
    const nextButton = document.getElementById('pagination-next');
    const lastButton = document.getElementById('pagination-last');
    setPaginationDetails();
    changePaginationButtonState(firstButton, prevButton, nextButton, lastButton);

    firstButton.addEventListener('click', () => {
        table.setPage(1);
        currentPageButton.innerText = table.getPage();
        changePaginationButtonState(firstButton, prevButton, nextButton, lastButton);
        setPaginationDetails();
    });
    nextButton.addEventListener('click', () => {
        table.nextPage();
        currentPageButton.innerText = table.getPage();
        changePaginationButtonState(firstButton, prevButton, nextButton, lastButton);
        setPaginationDetails();
    });
    prevButton.addEventListener('click', () => {
        table.previousPage();
        currentPageButton.innerText = table.getPage();
        changePaginationButtonState(firstButton, prevButton, nextButton, lastButton);
        setPaginationDetails();
    });
    lastButton.addEventListener('click', () => {
        table.setPage(table.getPageMax());
        currentPageButton.innerText = table.getPage();
        changePaginationButtonState(firstButton, prevButton, nextButton, lastButton);
        setPaginationDetails();
    });
}

/**
 * adding the pagination details to the view
 */
function setPaginationDetails() {
    const paginationDetails = document.getElementById('pagination-details');
    if (queryResult.result.length === 1) {
        paginationDetails.innerText = `Showing 1 entry`;
    } else {
        const start = (table.getPage() - 1) * 10 + 1;
        const end = table.getPage() * 10 > queryResult.result.length ? queryResult.result.length : table.getPage() * 10;
        paginationDetails.innerText = `Showing ${start} to ${end} of ${queryResult.result.length} entries`;
    }
}

/**
 * check if buttons should be enabled or disabled
 * @param first
 * @param prev
 * @param next
 * @param last
 */
function changePaginationButtonState(first, prev, next, last) {
    if (table.getPage() === 1) {
        first.classList.add('disabled');
        first.disabled = true;
        prev.classList.add('disabled');
        prev.disabled = true;
    } else {
        first.classList.remove('disabled');
        first.disabled = false;
        prev.classList.remove('disabled');
        prev.disabled = false;
    }

    if (table.getPage() === table.getPageMax()) {
        next.classList.add('disabled');
        next.disabled = true;
        last.classList.add('disabled');
        last.disabled = true;
    } else {
        next.classList.remove('disabled');
        next.disabled = false;
        last.classList.remove('disabled');
        last.disabled = false;
    }
}

/**
 * align the columns header title to the right
 */
function alignRightHeaders() {
    document.querySelectorAll('.tabulator-col-title').item(1).classList.add('align-right');
    headersToAlignRight.forEach(index => {
        document.querySelectorAll('.tabulator-col-title').item(index).classList.add('align-right');
    });
}

/**
 * create the date table by creating a Tabulator object
 */
function fillDataTable() {
    tableStructure = getTableStructure(schema);
    const tableData = getTableData({...queryResult});
    if (tableData.length === 0) {
        return handleError({body: {message: 'No result was returned.'}});
    }
    loaderElement.classList.remove('active');
    document.getElementById('container').classList.remove('hide');
    setTableHeader();
    // create Tabulator on DOM element with id "example-table"
    table = new Tabulator('#table', {
        tooltipsHeader: getTooltipsHeader,
        layoutColumnsOnNewData: true,
        resizableColumns: false,
        pagination: 'local',
        paginationSize: 10,
        movableColumns: true,
        placeholder: 'No result was returned.',
        data: tableData, //assign data to table
        layout: 'fitDataFill', //fit columns to width of table
        columns: tableStructure,
        height: 481,
        tooltipGenerationMode: 'hover'
    });
    alignRightHeaders();
    fillModalColumns();
    addButtons();
}

/**
 * If one of the property key has a . we replace it by the string 'dot' to avoid an error in Tabulator
 * @param {string} value 
 */
function escapeDotCharacters(value) {
    return value.replace(/\./g, 'dot');
}

/**
 * get query configuration
 * @returns {Promise<any>}
 */
async function getQuery() {
    try {
        if (queryParams.global.queryId !== undefined){
            return await makeRequest(
                'POST',
                `api/getQuery`,
                {
                    id: queryParams.global.queryId,
                    sourceKey: queryParams.global.sourceKey
                }
            );    
        } else {
            return await makeRequest(
                'POST',
                `api/getQueryByName`,
                {
                    name: queryParams.global.queryName,
                    sourceKey: queryParams.global.sourceKey
                }
            );
        }
        
    } catch(e) {
        handleError(e);
    }
}

function parseBool(val)
{
    if ((typeof val === 'string' && (val.toLowerCase() === 'true' || val.toLowerCase() === 'yes')) || val === 1)
        return true;
    else if ((typeof val === 'string' && (val.toLowerCase() === 'false' || val.toLowerCase() === 'no')) || val === 0)
        return false;

    return true;
}

/**
 * start the plugin table
 * @returns {Promise<void>}
 */
async function main() {
    loaderElement.classList.add('active');
    parseQueryParams();
    try {
        isTruncated = parseBool(queryParams.global.truncated);
        validateGlobalQueryParams(queryParams.global);
        query = JSON.parse((await getQuery()).response).body;
        validateTemplateFieldsParams(query);
        await getSchema();
        const isConfigurationValid = await validatePluginConfiguration();
        if (isConfigurationValid) {
            await runQueryByID(query);
            fillDataTable();
        }
    } catch(e) {
        handleError(e);
    }

}

main();
