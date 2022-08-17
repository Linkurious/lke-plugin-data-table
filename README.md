# Data-table plugin for Linkurious Enterprise

This Linkurious Enterprise plugin allow displaying the result of a
query (or query template) as a table.

![data-table plugin screenshot](./data-table-screenshot.png)

## Configuration

You can configure a plugin via the [Linkurious Configuration](https://doc.linkurio.us/admin-manual/latest/configure/).

Configuration keys supported by all the plugins:
| Key | Type | Description | Example |
| :-- | :-- | :-- | :-- |
| `basePath`    | string (**optional**)            | A base path on which the plugin will be mounted. Defaults to [the manifest name](https://github.com/Linkurious/lke-plugin-data-table/blob/master/manifest.json#L2). | `"table"` |
| `debugPort`   | number (**optional**)            | A debug port on which to attach a debugger for the plugin NodeJS process. If not specfified, the plugin won't be started in debug mode. | `9230` |

Configuration keys supported only by the data-table plugin:

| Key | Type | Description | Example |
| :-- | :-- | :-- | :-- |
| `entityType`  | "edge" \| "node" (**required**)  | Whether to display nodes or edges in the table. | `"node"` |
| `itemType`    | string (**required**)            | Name of the node category or edge type to display in the table. | `"Company"` |
| `delimiter`    | string (**optional**)           | The delimiter used for csv files downloads. By default "," is used | `";"` |
| `properties`  | string\[] (**optional**)         | Property names to include in the table. Defaults to all the properties of `itemType`. | `["name", "address", "vat_number"]` |

Configuration example for 1 data-table instance accesible via `/plugins/table`:
<img width="1036" alt="Screenshot 2021-03-09 at 18 59 07" src="https://user-images.githubusercontent.com/11739632/110516230-9508c200-8109-11eb-9fae-1218010597f6.png">

Configuration example for 2 data-table instances accesible via `/plugins/table` and `/plugins/edgeTable`:
<img width="1031" alt="Screenshot 2021-03-10 at 15 16 40" src="https://user-images.githubusercontent.com/11739632/110642781-a4444a00-81b3-11eb-9864-919916648db9.png">

*You can run multiple data-table instances by passing an array with unique `basePath` per config.*

## URL parameters

This plugin supports the following URL parameters in the query string:

| Param | Type | Description | Example |
| :-- | :-- | :-- | :-- |
| `queryId`                     | integer (**required**)  | ID of the query to run. | `queryId=87` |
| `sourceKey`                   | string (**required**)   | Key of the data-source to run the query on. | `sourceKey=b16e9ed5` |
| `limit`                       | integer (**optional**)  | Maximum number of results to display. | `limit=500` |
| `param_number_{{Encoded field name}}` | number (**optional**)   | *For query templates*, any numerical parameter of the template. | `param_number_age=30` |
| `param_string_{{Encoded field name}}` | string (**optional**)   | *For query templates*, any string parameter of the template. | `param_string_city=Paris` |
| `param_ids_{{Encoded field name}}`    | comma-separated list (**optional**)  | *For query templates*, any edgeset/nodeset parameter of the template. | `param_ids_target_ids=1,50,12` |

### Usage with standard queries

In order to display the result of a standard query in a table:

1. Create a standard READ query. For example: `MATCH (n) return n LIMIT 1000`.
2. Note down the newly-created query ID, it will by the value of `queryId`. For example: `queryId=87`.
3. Compose a valid data-table plugin URL and open it in a new tab. For example:
```
{{baseUrl}}plugins/table?queryId=87&sourceKey={{sourceKey}}
```
You can save this URL as a [Custom Action](https://doc.linkurio.us/user-manual/latest/custom-actions/), and when triggered, the `{{baseUrl}}` and `{{sourceKey}}` will be replaced with your LKE base URL and your current data-source key, respectively, and the final URL will be opened in a new tab. You can always do it manually, if you want.

### Usage with query templates

In order to display the result of a query template in a table:

1. Create a READ query template. For example: `MATCH (n) where n.city={{"City Name":string}} return n LIMIT 1000`.
2. Note down the newly-created query ID, it will by the value of `queryId`. For example: `queryId=19`.
2. Note down each field title, [URL encode it](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent), prepend it with a valid URL parameter and give it a value. For example: `param_string_City%20Name=Paris`.
3. Compose a valid data-table plugin URL and open it in a new tab. For example:
```
{{baseUrl}}plugins/table?queryId=19&sourceKey={{sourceKey}}&param_string_City%20Name=Paris
```
You can save this URL as a [Custom Action](https://doc.linkurio.us/user-manual/latest/custom-actions/), and when triggered, the `{{baseUrl}}` and `{{sourceKey}}` will be replaced with your LKE base URL and your current data-source key, respectively, and the final URL will be opened in a new tab. You can always do it manually if you want.

*Note that when prepending `param_string_` to the template field name `City Name`, we had to [encode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) it into `City%20Name` in order to be URL compliant.*
