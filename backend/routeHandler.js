'use strict';
const bodyParser = require('body-parser');

module.exports = function configureRoutes(options) {
  options.router.use(bodyParser.json({ limit: '50mb', extended: true }));

  /**
   * sanitize the templateData attribute for runQueryByID parameter
   * @param templateFieldsParams
   * @param templateFieldsQuery
   * @returns {*}
   */
  function sanitizeTemplateData(templateFieldsParams, templateFieldsQuery) {
    templateFieldsQuery.forEach(queryParam => {
      if (queryParam.type === 'nodeset' || queryParam.type === 'edgeset') {
        const regExpStr = new RegExp('(?!<(?:\\(|\\[)[^)\\]]+),(?![^(\\[]+(?:\\)|\\]))', 'g');
        templateFieldsParams[queryParam.key] = templateFieldsParams[queryParam.key].split(regExpStr);
      }
    });
    return templateFieldsParams;
  }

  /**
   * check if the plugin configuration is valid
   * @param schemaTypes
   * @param entityType
   * @param itemType
   * @param properties
   * @param delimiter
   * @returns {{message: string}|{message: string}|{message: string}|null|{message: string}}
   */
  function checkPluginsConfiguration(schemaTypes, entityType, itemType, properties, delimiter) {
    if (entityType && entityType !== 'node' && entityType !== 'edge') {
      return { message: 'Invalid plugin configuration “entityType” (must be “node” or “edge”)' };
    }
    if (itemType === undefined) {
      return { message: 'Missing plugin configuration “itemType”' };
    } else if (!schemaTypes.some((type => type.itemType === itemType))) {
      return { message: 'Invalid plugin configuration “itemType” (must be an existing node category or edge type)' };
    }
    if (properties && (!Array.isArray(properties) || properties.length === 0)) {
      return { message: 'Invalid plugin configuration “properties” (must be a non-empty array of property names)' };
    }
    if (delimiter && delimiter.length != 1) {
      return { message: 'Invalid plugin configuration “delimiter” (only one character is allowed)' };
    }
    return null;
  }

  options.router.post('/checkPluginsConfiguration', (req, res) => {
    const schemaTypes = req.body.results;
    const entityType = options.configuration.entityType;
    const itemType = options.configuration.itemType;
    const properties = options.configuration.properties;
    const delimiter = options.configuration.delimiter;
    const error = checkPluginsConfiguration(schemaTypes, entityType, itemType, properties, delimiter);
    if (error) {
      res.status(412);
      res.send(JSON.stringify({ status: 412, body: { error } }));
    } else {
      res.status(200);
      res.send(JSON.stringify(options.configuration));
    }
  });

  options.router.post('/getQuery', async (req, res) => {
    const getQueryParams = {
      id: +req.body.id,
      sourceKey: req.body.sourceKey
    };
    const query = await options.getRestClient(req).graphQuery.getQuery(getQueryParams);
    res.status(200);
    res.contentType('application/json');
    res.send(JSON.stringify(query));
  });

  options.router.post('/getQueryByName', async (req, res) => {
    try {
    // Checking templates
      const getQueryParams = {
        sourceKey: req.body.sourceKey,
        type: "template"
      };

      let response = (await options.getRestClient(req).graphQuery.getQueries(getQueryParams));

      let queries = response.body.filter((q) => {
        return q.name.toLowerCase() === req.body.name;
      });

      // Checking statics
      getQueryParams.type = "static"

      response = (await options.getRestClient(req).graphQuery.getQueries(getQueryParams));

      queries = queries.concat(response.body.filter((q) => {
        return q.name === req.body.name;
      }));

      if (queries.length === 0) {
        throw new Error(`Query ${req.body.name} either does not exist or you do not have access to it.`);
      }
      else if (queries.length === 1) {
        response.body = queries[0]
        res.status(200);
        res.contentType('application/json');
        res.send(JSON.stringify(response));
      }
      else {
        throw new Error(`Multiple queries named ${req.body.name} exists. The query name must be unique.`);
      }
    } catch (error) {
      res.status(400);
      res.contentType('application/json');
      res.send(JSON.stringify({ status: 400, body: { error: {message: error.message } }));
    }

  });


  options.router.post('/runQueryByIDPlugin', async (req, res) => {
    const data = {
      id: +req.body.queryParams.global.queryId,
      sourceKey: req.body.queryParams.global.sourceKey,
      limit: +req.body.queryParams.global.limit
    };
    if (req.body.query.templateFields) {
      data.templateData = sanitizeTemplateData(req.body.queryParams.templateFields, req.body.query.templateFields);
    }
    try {
      const queryResult = await options.getRestClient(req).graphQuery.runQueryById(data);
      res.status(200);
      res.contentType('application/json');
      res.send(JSON.stringify(queryResult));
    } catch (e) {
      res.status(400);
      res.contentType('application/json');
      const error = e.originalResponse.body ? e.originalResponse.body : e;
      res.send(JSON.stringify({ status: 400, body: { error } }));
    }

  });

  options.router.get('/getSchema', async (req, res) => {
    try {
      const schemaResult = await options.getRestClient(req).graphSchema.getTypesWithAccess({
        entityType: options.configuration.entityType || 'node',
        sourceKey: req.query.sourceKey
      });
      res.status(200);
      res.contentType('application/json');
      res.send(JSON.stringify(schemaResult));
    } catch (e) {
      res.status(412);
      res.send(JSON.stringify({ status: 412, body: e }));
    }
  });
};
