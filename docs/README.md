## Installation

* Run `bundle install`

## Editing
	jekyll serve
	jekyll serve --drafts --host=0.0.0.0 #if serving over IP
  
## Production Build (if that's you're thing ...)

The production build enables Google Analytics and HTML minification on specific pages.

	JEKYLL_ENV=production jekyll build
