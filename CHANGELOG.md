### 0.4.8
Better diffing of Arrays and Objects

### 0.4.7
Added more methods for Sugar.js

### 0.4.6
Fixed a bug that would always add updated members to the end of a collection,
instead of updating them in the correct order.

### 0.4.5
Fixed a bug that would not generate the correct route for an index if INDEX
was not specified on singleton-type models.

### 0.4.4
Fixed a bug that would resolve destroyed models instantly. Added the ability
to define an `INDEX` route override and permissable as part of Model-level
routes configuration.

### 0.4.3
Added more info on `@FLUTE_REQUEST_INFO_*` events like 404 status and body.

### 0.4.2
Fixed a bug that would prevent returning new records called with `.create()`,
no attributes.

### 0.4.1
Changed schema type Object to return empty object by default instead of null.

## 0.4.0
Added the ability to pass in URL parameters to `.all` and `.find` model
methods. Can be either a string or an object which is turned into a string.

### 0.3.2
Fixed a bug that would save no attributes on a new model because of diffing

### 0.3.1
Fixed a bug that diffed records before they had a chance to interpolate routes

## 0.3.0
Added a `diffMode` feature, enabled by default. This will only submit
changed/new attributes of a model. It can be switched off using the `setAPI`
method.

## 0.2.5
Started clearing Rails-style nested attributes in schema, so they don't
persist across multiple requests.
