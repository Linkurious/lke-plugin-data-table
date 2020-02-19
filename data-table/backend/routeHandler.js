'use strict';
const bodyParser = require('body-parser');

module.exports = function configureRoutes(options) {
    options.router.use(bodyParser.json());

    function checkPluginsConfiguration(schemaTypes, entityType, itemType, properties) {
        if (entityType && entityType !== 'node' && entityType !== 'edge') {
            return {message: 'Invalid plugin configuration “entityType” (must be “node” or “edge”)'};
        }
        if (itemType === undefined) {
            return {message: 'Missing plugin configuration “itemType”'};
        } else if (!schemaTypes.some((type => type.itemType === itemType))) {
            return {message: 'Invalid plugin configuration “itemType” (must be an existing node category or edge type)'};
        }
        if (!Array.isArray(properties) || properties.length === 0) {
            return {message: 'Invalid plugin configuration “properties” (must be a non-empty array of property names)'};
        }
        return null;
    }

    options.router.post('/checkPluginsConfiguration', (req, res) => {
        const schemaTypes = req.body.results;
        const entityType = options.configuration.entityType;
        const itemType = options.configuration.itemType;
        const properties = options.configuration.properties;
        const error = checkPluginsConfiguration(schemaTypes, entityType, itemType, properties);
        if (error) {
            res.status(412);
            res.send(JSON.stringify({status: 412, body: {error}}));
        } else {
            res.status(200);
            res.send();
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

    options.router.get('/runQueryByIDPlugin', async (req, res) => {
        const data = {
            id: +req.query.queryId,
            sourceKey: req.query.sourceKey,
            limit: +req.query.limit
        };
        try {
            const queryResult = await options.getRestClient(req).graphQuery.runQueryById(data);
            res.status(200);
            res.contentType('application/json');
            res.send(JSON.stringify(queryResult));
        } catch(e) {
            console.log(e);
        }
    });

    options.router.get('/getSchema', async (req, res) => {
        const schemaResult = await options.getRestClient(req).graphSchema.getTypesWithAccess({
            entityType: options.configuration.entityType || 'node',
            sourceKey: req.query.sourceKey
        });
        res.status(200);
        res.contentType('application/json');
        res.send(JSON.stringify(schemaResult));
    });

};
