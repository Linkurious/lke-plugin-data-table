# Data-table plugin for Linkurious Enterprise

This Linkurious Enterprise plugin allow displaying the result of a
query (or query template) as a table.

![data-table plugin screenshot](./data-table-screenshot.png)

## Configuration

These are the configuration keys that need to be set in the plugin
configuration, via the Linkurious Configuration.

- `entityType` (**required**, `"edge"` or `"node"`): whether to display
  nodes or edges in the table (e.g. `"node"`).
- `itemType` (**required**, string): name of the node-category or
  edge-type to display in the table (e.g. `"COMPANY"`).
- `properties` (**optional**, array): property names to include in the
  table (e.g. `["name", "age", "date_of_birth"]`). Defaults to all
  properties of the configured `itemType`.
- `basePath` (**optional**, string): URL path in which the plugin will
  be deployed (e.g. `"my-plugin"`). Defaults to plugin name.

Full configuration example:
```json
{
 "data-table": {
    "basePath": "table",
    "entityType": "node",
    "itemType": "Company",
    "properties": ["name", "address", "vat_number"]
 }
}
```

## URL parameters

These are the URL parameters that this plugin accepts:

- `queryId` (**required**, integer): query to run (e.g. `queryId=26`).
- `sourceKey` (**required**, string): Key of the data-source to run the
  query on (e.g. `sourceKey=b16e9ed5`).
- `limit` (**optional**, integer): maximum number of results to display
  (e.g. `limit=1000`).
- `param_number_PARAM NAME` (**optional**, number): *for query
  templates*, any numerical parameter of the template (e.g.
  `param_number_my%20number=123`).
- `param_string_PARAM NAME` (**optional**, string): *for query
  templates*, any string parameter of the template (e.g.
  `param_string_my%20param=abc`).
- `param_ids_PARAM NAME` (**optional**, comma-separated list): *for
  query templates*, any edgeset/nodeset parameter of the template (e.g.
  `param_ids_my%20id%20list=1,2,3`).

Full URL example (line breaks for readability):
```
https://linkurious.example.com/plugins/data-table
  ?queryId=26
  &sourceKey=b16e9ed5
  &limit=1000
  &param_string_city=Paris
```
