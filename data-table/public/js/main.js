let queryResult;
let queryParams;
let tableStructure;
let schema;
let table;
let showCheckBox = false;
const loaderElement = document.getElementById('loader');
document.getElementById('body').addEventListener('click', (e) => {
    document.getElementById('checkboxes').style.display = 'none';
    showCheckBox = false;
    e.stopPropagation();
});

/**
 * make XMLHttpRequest
 */
function makeRequest(verb = 'GET', url, body) {
    const xmlHttp = new XMLHttpRequest();
    // Return it as a Promise
    return new Promise(function (resolve, reject) {
        xmlHttp.onreadystatechange = function () {
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
 * @param event
 */
function handleError(event) {
    document.getElementById('error_description').innerText = event.body.message;
    document.getElementById('loading').classList.add('hide');
    document.getElementById('spinner').classList.add('hide');
    document.getElementById('error').classList.remove('hide');
    throw Error(event.body.message);
}

function setQueryResult(result) {
    if (result.status === 200) {
        queryResult = result.body;
    } else {
        handleError(result);
    }
}

async function runQueryByID(query) {
    const result = await makeRequest(
        'POST',
        `/api/plugins/table/runQueryByIDPlugin`,
        {query, queryParams}
    );
    setQueryResult(JSON.parse(result.response));
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
                result.global[parameter.key] = decodeURIComponent(parameter.value);
            } else if (parameter.type === 'templateField') {
                result.templateFields[parameter.key] = decodeURIComponent(parameter.value);
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
            'queryId'
        ],
        startWith: [
            'param_number_',
            'param_ids_',
            'param_string_'
        ]
    };
    if (allowedParams.oneOf.includes(item[0])) {
        return {key: item[0], value: item[1], type: 'global'};
    } else {
        const prefix = allowedParams.startWith.find((prefix) => item[0].startsWith(prefix));
        switch (prefix) {
            case  'param_number_':
                return {key: item[0].replace('param_number_', ''), value: +item[1], type: 'templateField'};
            case  'param_ids_':
                return {key: item[0].replace('param_ids_', ''), value: item[1], type: 'templateField'};
            case  'param_string_':
                return {key: item[0].replace('param_string_', ''), value: item[1], type: 'templateField'};
            default:
                return false;
        }
    }
}

function validateQueryParams(query) {
    if (queryParams.global.queryId === undefined) {
        return handleError({body: {message: 'Missing URL parameter “query_id”'}});
    } else if (!Number.isInteger(+queryParams.global.queryId)) {
        return handleError({body: {message: 'URL parameter “query_id” must be a number'}});
    } else if (queryParams.global.sourceKey === undefined) {
        return handleError({body: {message: 'Missing URL parameter “source_key” (must be a string)'}});
    } else if (query.templateFields && query.templateFields.length > 0) {
        query.templateFields.forEach(template => {
            if (queryParams.templateFields.hasOwnProperty(template.key)) {
                if (template.type === 'number' && isNaN(+queryParams.templateFields[template.key])) {
                    return handleError({body: {message: `Invalid URL parameter “${template.key}” (it must be a number)`}});
                }
            } else {
                return handleError({body: {message: `Missing URL parameter “${template.key}”`}});
            }

        });
    }
    return true;
}

function setSchema(result) {
    if (result.status === 200) {
        schema = result.body.results;
    } else {
        handleError(result);
    }
}

async function getSchema() {
    const result = await makeRequest(
        'GET',
        `/api/plugins/table/getSchema?sourceKey=${queryParams.global.sourceKey}`,
        null
    );
    setSchema(JSON.parse(result.response));
}

async function validatePluginConfiguration() {
    try {
        await makeRequest(
            'POST',
            `/api/plugins/table/checkPluginsConfiguration`,
            {results: schema}
        );
        return true;
    } catch (e) {
        handleError(e);
    }
}

function truncateColumnTitle(cell) {
    return truncateText(cell.getValue());
}

function truncateText(text, maxLength = 50) {
    if (text.length > maxLength) {
        return `${text.slice(0, maxLength - 2)}...`;
    } else {
        return text;
    }
}

function getFilteredSchema(schemaStructure) {
    if (queryResult.nodes.length > 0) {
        return schemaStructure.filter(result => {
            return queryResult.nodes[0].data.categories.includes(result.itemType);
        });
    } else {
        return schemaStructure.filter(result => {
            return queryResult.edges[0].data.type === result.itemType;
        });
    }
}

function getTableStructure(schemaStructure) {
    const filteredSchema = getFilteredSchema(schemaStructure);
    const sanitizedData = filteredSchema[0].properties.map(property => {
        return {
            title: property.propertyKey,
            field: property.propertyKey,
            align: 'left',
            titleFormatter: truncateColumnTitle
        };
    });
    return [{title: 'id', field: 'id', align: 'center'}, ...sanitizedData];
}

function getTableData(queryResult) {
    return (queryResult.nodes.length > 0) ?
        queryResult.nodes.map(node => {
            return {...node.data.properties, 'id': node.id};
        }) :
        queryResult.edges.map(edge => edge.data.properties);
}

function getTooltipsHeader(column) {
    return column.getDefinition().title;
}

function setTableTitle() {
    document.getElementById('table_title').innerText = (queryResult.nodes.length > 0) ?
        `List of properties (Categories: ${queryResult.nodes[0].data.categories}):` :
        `List of properties (type: ${queryResult.edges[0].data.type}):`;
}

function updateFilter() {
    const propertyFilter = document.getElementById('filter--select_property');
    const typeFilter = document.getElementById('filter--select_comparision_type');
    table.setFilter(
        propertyFilter.options[propertyFilter.selectedIndex].value,
        typeFilter.options[typeFilter.selectedIndex].value,
        document.getElementById('filer--input_search').value
    );
}

function clearFilter() {
    document.getElementById('filter--select_property').value = 'id';
    document.getElementById('filter--select_comparision_type').value = '=';
    document.getElementById('filer--input_search').value = '';
    table.clearFilter();
}

function switchShowCheckbox(e) {
    const selectColumnsElement = document.getElementById('checkboxes');
    if (!showCheckBox) {
        selectColumnsElement.style.display = 'block';
        showCheckBox = true;
    } else {
        selectColumnsElement.style.display = 'none';
        showCheckBox = false;
    }
    e.stopPropagation();
}

function preventPropagation(e) {
    e.stopPropagation();
}

function filterTableColumns(e) {
    if (e.target.checked) {
        table.showColumn(e.target.id);
    } else {
        table.hideColumn(e.target.id);
    }
}

function addFilter() {
    setTimeout(() => {
        const columnsList = table.getColumnDefinitions();

        // add select element to choose the columns to show
        document.getElementById('columns_select').addEventListener('click', switchShowCheckbox);
        document.getElementById('checkboxes').addEventListener('click', preventPropagation);
        const selectColumnsElement = document.getElementById('checkboxes');
        columnsList.forEach((column) => {
            const label = document.createElement('label');
            const description = document.createTextNode(truncateText(column.title, 30));
            const checkBoxElement = document.createElement('input');
            checkBoxElement.setAttribute('type', 'checkbox');
            checkBoxElement.setAttribute('id', column.title);
            checkBoxElement.setAttribute('name', column.title);
            checkBoxElement.checked = true;
            label.appendChild(checkBoxElement);
            label.appendChild(description);
            selectColumnsElement.appendChild(label);
            checkBoxElement.addEventListener('change', filterTableColumns);
        });

        // add select element to choose the properties
        const selectPropertyElement = document.getElementById('filter--select_property');
        columnsList.forEach((column) => {
            const optionElement = document.createElement('option');
            optionElement.value = column.title;
            optionElement.text = truncateText(column.title, 20);
            selectPropertyElement.appendChild(optionElement);
        });

        document.getElementById('table_filter').classList.remove('hide');
        document.getElementById('filter--select_property').addEventListener('change', updateFilter);
        document.getElementById('filter--select_comparision_type').addEventListener('change', updateFilter);
        document.getElementById('filer--input_search').addEventListener('keyup', updateFilter);
        document.getElementById('filter--rest_button').addEventListener('click', clearFilter);

    }, 10);

}

function addDownloadCSVButton() {
    setTimeout(() => {
        document.getElementById('download_csv--container').classList.remove('hide');
        document.getElementById('download_csv--button').addEventListener('click', () => {
            table.download('csv', 'data.csv');
        });
    }, 10);
}

function fillDataTable() {
    loaderElement.classList.remove('active');
    setTableTitle();
    tableStructure = getTableStructure(schema);
    const tableData = getTableData({...queryResult});

    // create Tabulator on DOM element with id "example-table"
    table = new Tabulator('#table', {
        tooltipsHeader: getTooltipsHeader,
        layoutColumnsOnNewData: true,
        resizableColumns: false,
        pagination: 'local',
        paginationSize: 15,
        paginationSizeSelector: [8, 12, 16, 20],
        movableColumns: true,
        placeholder: 'There was not matches for the filter',
        data: tableData, //assign data to table
        layout: 'fitDataFill', //fit columns to width of table
        columns: tableStructure,
        rowClick: function (e, row) { //trigger an alert message when the row is clicked
            alert('Row ' + row.getData().id + ' Clicked!!!!');
        }
    });
    addFilter();
    addDownloadCSVButton();
}

async function getQuery() {
    try {
        return await makeRequest(
            'POST',
            `/api/plugins/table/getQuery`,
            {
                id: queryParams.global.queryId,
                sourceKey: queryParams.global.sourceKey
            }
        );
    } catch (e) {
        handleError(e);
    }
}

async function main() {
    loaderElement.classList.add('active');
    parseQueryParams();
    const query = JSON.parse((await getQuery()).response).body;
    validateQueryParams(query);
    await getSchema();
    const isConfigurationValid = await validatePluginConfiguration();
    if (isConfigurationValid) {
        await runQueryByID(query);
        fillDataTable();
    }

}

main();
