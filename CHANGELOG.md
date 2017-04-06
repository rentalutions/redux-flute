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
