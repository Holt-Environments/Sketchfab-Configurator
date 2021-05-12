/*
 * Holt Environments
 * Anthony Mesa
 * 
 * Custom sketchfab-customiser created for AstroTurf.
 * 
 * For this script to work, the sketchfab api script must also be included
 * on the same page in which this customiser is being implemented.
 * 
 * e.g.
 * <script type="text/javascript" src="
 * https://static.sketchfab.com/api/sketchfab-viewer-1.10.0.js"></script>
 */

//=============================================================================
// Global Control Variables
//=============================================================================

// Burger
//const SKETCHFAB_UID = '20847769d06f47a582113b0df1c88990';

// Turf
// https://sketchfab.com/3d-models/turf-optimized-3464d838341c4b299d89cd427065738d

const SKETCHFAB_UID = '3464d838341c4b299d89cd427065738d';

const CONTAINER_NAME = 'sketchfab-customiser';
const SKETCHFAB_IFRAME_ID = 'api-iframe';

//=============================================================================
// Initializing container code
//=============================================================================

// Populate the sketchfab customiser with the required elements for UI and 
// sketchfab iframe. Hierarchy is:
//
// sketchfab customizer div
// |_ option types panel
// |_ options panel
// |  |_ panel content
// |_ filter panel
// |_ api iframe  

// option types panel
var option_types_panel = document.createElement('div');
option_types_panel.id = 'option-types-panel';
option_types_panel.classList.add
(
    'no-scrollbar',
    'no-scrollbar::-webkit-scrollbar'
);

// options panel
var options_panel = document.createElement('div');
options_panel.id = 'options-panel';

// options panel content
var options_panel_content = document.createElement('div');
options_panel_content.id = 'options-panel-content';
options_panel.appendChild(options_panel_content);

// filter panel
var filter_panel = document.createElement('div');
filter_panel.id = 'filter-panel';

// api frame
var sketchfab_iframe = document.createElement('iframe');
sketchfab_iframe.id = SKETCHFAB_IFRAME_ID;
Object.assign(sketchfab_iframe.style, {
    "width": "100%",
    "height": "100%",
    "z-index": "1"
});
sketchfab_iframe.setAttribute("allow", "autoplay; fullscreen; vr");
sketchfab_iframe.setAttribute("allowvr", "");
sketchfab_iframe.setAttribute("allowfullscreen", "");
sketchfab_iframe.setAttribute("mozallowfullscreen", "true");
sketchfab_iframe.setAttribute("webkitallowfullscreen", "true");

sketchfab_customizer = document.getElementById(CONTAINER_NAME);
sketchfab_customizer.appendChild(option_types_panel);
sketchfab_customizer.appendChild(options_panel);
sketchfab_customizer.appendChild(filter_panel);
sketchfab_customizer.appendChild(sketchfab_iframe);

//=============================================================================
// Sketchfab Client Object
//=============================================================================

/**
 * Container for customiser functionality that relies on sketchfab instance.
 * 
 * At the very least, this object should always have an api field and
 * an init function defined.
 * 
 * Because this is essentially the state machine for the sketchfab customizer,
 * the ui should always make calls to sketchfabClient to get data and never the 
 * other way around.
 * 
 * Fields:
 * - api - API client object
 * - scene_root - Hierarchical root object for easy access to objects in scene.
 * - types - list of type objects
 */
var sketchfabClient = {
    
    api: null,
    filter_root: null,
    types: [],

    /**
     * Initializes the sketchfab client, populates the scene_root, and then 
     * loads the ui after the client is finished loading.
     * 
     * @param {string} _iframe HTML id attribute of api-iframe in which to 
     * populate the sketchfab view. 
     */
    init: function (_iframe)
    {
        // Sketchfab() is defined in the sketchfab-viewer script file that
        // should be included at the bottom of the HTML script for the
        // page that will contain the customiser.
        var client = new Sketchfab(_iframe);

        // Initialises the sketchfab client using the proper UID and an object
        // - with success and error callback functions defined within it -
        // as parameters.
        client.init( SKETCHFAB_UID,
        {
            /**
             * Success callback
             * 
             * @param {*} _api 
             */
            success: function onSuccess( _api )
            {
                sketchfabClient.api = _api;
                sketchfabClient.api.start();

                // define a callback to be executed when the sketchfab api
                // event 'viewerready' is fired.
                sketchfabClient.api.addEventListener( 'viewerready', function()
                {
                    // This function gets the nodemap from the sketchfab api.
                    // ui.load() should always be the last call in this
                    // function since this is an asynchronous call and the
                    // loading of the ui is dependent on the data retrieved
                    // from the nodemap.
                    sketchfabClient.api.getNodeMap(function (_err, _nodes)
                    {
                        if (_err)
                        {
                            console.error(_err);
                            return;
                        }
                        
                        // var keys = Object.keys(_nodes);

                        // for (var i = 0; i < keys.length; i++)
                        // {
                        //     if (_nodes[keys[i]].name == "GLTF_SceneRootNode")
                        //     {
                        //         sketchfabClient.scene_root = _nodes[keys[i]];
                        //     }
                        // }

                        sketchfabClient.setFilterRoot(_nodes);
                        sketchfabClient.setTypes(_nodes);
                        sketchfabClient.setInitialObjectsVisible();

                        // Calling ui load here so that it runs after
                        // getNodeMap is complete. If ui.load() is called
                        // outside of this function, then it can not be
                        // guaranteed that scene_root has been asynchronously 
                        // populated in time for the ui to load correctly.
                        ui.load();

                    }.bind(this));
                });
            },
        
            /**
             * Error callback
             */
            error: function onError() {
                console.log( 'Viewer error' );
            }
        });
    },

    /**
     * Gets the scene root from the sketchfab viewer.
     * 
     * @param {*} _nodes nodes retrieved from sketchfab api's
     * getNodeMap function.
     * @returns scene root object
     */
    getSceneRoot: function(_nodes)
    {
        var keys = Object.keys(_nodes);

        for (var i = 0; i < keys.length; i++)
        {
            if (_nodes[keys[i]].name == "GLTF_SceneRootNode")
            {
                scene_root = _nodes[keys[i]];
            }
        }

        return scene_root;
    },

    /**
     * Sets the filter root for the sketchfab object.
     * 
     * @param {*} _nodes nodes retrieved from sketchfab api's
     * getNodeMap function.
     */
    setFilterRoot: function(_nodes)
    {
        var scene_root = sketchfabClient.getSceneRoot(_nodes);

        for (i = 0; i < scene_root.children.length; i++)
        {
            var element = scene_root.children[i];

            if (element.name.split('_')[0] == "#") {
                sketchfabClient.filter_root = element;
            }
        }
    },

    /**
     * Sets the types for the sketchfab object.
     * 
     * @param {*} _nodes nodes retrieved from sketchfab api's
     * getNodeMap function.
     */
    setTypes: function(_nodes)
    {
        var scene_root = sketchfabClient.getSceneRoot(_nodes);

        for (i = 0; i < scene_root.children.length; i++)
        {
            var element = scene_root.children[i];

            if (element.name.split('_')[0] != "#") {
                sketchfabClient.types.push(element);
            }
        }
        console.log(sketchfabClient.types);
    },

    /**
     * This function is responsible for making sure that on load, only the 
     * first element of each "type" is visible. Else, all objects in the scene
     * will show up at once and overlap.
     */
    setInitialObjectsVisible: function()
    {
        var types = sketchfabClient.types;

        console.log("types length " + types.length);

        // Iterate across all of the types and select the first
        // element in each of types' children.
        for(i = 0; i < types.length; i++)
        {
            var type = sketchfabClient.types[i];

            sketchfabClient.selectObject(
                type.instanceID, 
                type.children[0].instanceID
            );
        }
    },

    /**
     * Selects the object given by root index and submenu id by showing said object
     * and hiding all others within the type group.
     * 
     * @param {number} _type_instance_id Index of type group in root to iterate over
     * @param {number} _option_id Index of object in type group to be shown
     */
    selectObject: function(_type_instance_id, _option_id)
    {    
        var types = sketchfabClient.types;
        var type;

        for (i = 0; i < types.length; i++)
        {
            if ( types[i].instanceID == _type_instance_id )
            {
                type = types[i];
            }
        }

        if (type == null)
        {
            console.log(
                "sketchfabClient.selectObject - _type_instance_id " +
                _type_instance_id + " not found in root."
            );
            return;
        }

        for(j = 0; j < type.children.length; j++)
        {
            var id = type.children[j].instanceID;

            if (id == _option_id)
            {
                console.log("sketchfabClient.selectObject - " + 
                _type_instance_id + " " + _option_id);
                sketchfabClient.api.show(id);
            } else
            {
                sketchfabClient.api.hide(id);
            }
        }
    },

    /**
     * Transforms the object represented by _myNode using the translation
     * matrix provided in _pos. 
     * 
     * @param {object} _myNode Node object to be transformed
     * @param {number[]} _pos Translation matrix to be applied
     */
    translateObject: function(_myNode, _pos) {
        sketchfabClient.api.translate(_myNode, _pos, {
            duration: 1.0,
            easing: 'easeOutQuad'
        }, function(err, translateTo) {
            if (!err) {
                window.console.log('Object has been translated to', translateTo);
            }
        });
    },

    /**
     * Create an object that enumerates the picker types available.
     * 
     * @returns Object with key value pairs of type names and their 3d object
     * id counterpart.
     */
    getOptionTypes: function() {

        var types = {};

        for(i = 0; i < sketchfabClient.types.length; i++)
        {    
            if(sketchfabClient.types[i].name.split('_')[0] == "#")
            {
                continue;
            }
            var name = sketchfabClient.types[i].name.split('_')[0];
            var id = sketchfabClient.types[i].instanceID;

            console.log('sketchfabClient.getOptionTypes - name = ' + name);
            console.log('sketchfabClient.getOptionTypes - id = ' + id);

            if(!(name in types))
            {
                types[name] = id;
            }
        }

        return types;
    },

    /**
     * Get the 
     * 
     * @param {*} _type_group_id 
     * @param {*} _filter 
     * @returns 
     */
    getOptions: function(_type_group_id, _filter) {
        
        var options = {};
        var type_group;

        for(i = 0; i < sketchfabClient.types.length; i++) 
        {
            if (sketchfabClient.types[i].instanceID == _type_group_id){
                type_group = sketchfabClient.types[i];
            }
        }

        /* Iterate across the options available for the type group given as index. */
        for(i = 0; i < type_group.children.length; i++) {

            /* 'type-name_01' => 'type-name' */
            var typeName = type_group.name.split('_')[0];
            
            console.log(typeName);

            /* 'type-name option-name # filter1 filter2 filter3_01' => [type-name, option-name, #, filter1, filter2, filter3] */
            var optionName = type_group.children[i].name.split('_')[0].split(" ");

            console.log(optionName);

            if (typeName == optionName[0]) {
                /* [type-name, option-name, #, filter1, filter2, filter3] => [option-name, #, filter1, filter2, filter3] */
                optionName.shift();
            } else {
                console.log("sketchfabClient.getOptions: Error - Naming convention issue discovered in object hierarchy.");
                console.log(" ~ " + typeName + " " + optionName[0]);
                return null;
            }         

            if(_filter.length != 0) {
                console.log('filter exists');

                /* [option-name, #, filter1, filter2, filter3] > 1*/
                var filter_index = optionName.indexOf('#');

                if(filter_index != -1) {

                    var filter = optionName.slice(filter_index + 1, optionName.length);

                    /* for each element in the filter that was provided > filter1 */
                    _filter.forEach(element1 => {
                        /* for each element in the filter spliced from object name > filter1, filter2, filter3 */
                        filter.forEach(element => { 
                            if(element == element1) {

                                var option_name = optionName.slice(0, filter_index).join(' ');
                                
                                console.log("option name - " + option_name);

                                var id =  type_group.children[i].instanceID;

                                console.log("id - " + id);

                                if(!(option_name in options)) { options[option_name] = id; }
                            }
                        });
                    });

                } else {
                    var option_name = optionName.join(' ');

                    var id =  type_group.children[i].instanceID;

                    if(!(option_name in options)) { options[option_name] = id; }
                }
            } else {
                console.log('filter doesnt exist');

                var filter_index = optionName.indexOf('#');

                if(filter_index != -1) {
                    var option_name = optionName.slice(0, filter_index).join(' ');
                                
                    var id =  type_group.children[i].instanceID;

                    if(!(option_name in options)) { options[option_name] = id; }
                } else {
                    var option_name = optionName.join(' ');

                    var id =  type_group.children[i].instanceID;

                    if(!(option_name in options)) { options[option_name] = id; };
                }
            }
        }

        console.log(options);

        return options;
    },

    /**
     * Get the filters available from the blend file.
     * 
     * Filters shoulld be geometric objects with a single vertex at its origin
     * parented to a single empty node with the name # that is a child
     * of the root level. That is, in blender the filter is found at:
     * 
     * root
     *  |_ (empties for object catagories)
     *  |_ ...
     *  |
     *  |_ #   <-- name of the filter empty should ONLY be '#'
     *     |_ filter1
     *     |_ filter2
     * 
     * Thus the returned array from the example blender scene structure above
     * should be ['filter1', 'filter2']
     */
    getFilters: function()
    {
        var filter_names = [];

        // Iterate across the children of filter_root to create the
        // filter_names array

        for(i = 0; i < sketchfabClient.filter_root.children.length; i++)
        {
            filter_names.push(sketchfabClient.filter_root.children[i].name.split('_')[0]);
        }

        return filter_names;
    }
};

/* After defining the object, we can now initialize the sketchfabClient. */
sketchfabClient.init( document.getElementById( SKETCHFAB_IFRAME_ID ) );



//==============================================================================
// ui object
//==============================================================================

var ui = {

    // Index of active element in root being viewed.
    active_panel_instance_id: null,

    filter_options: ['normal', 'fun'],

    current_filter: [],

    /**
     * Loads the ui dynamically depending on the elements in the sketchfab view.
     */ 
    load: function()
    {
        ui.loadOptionsPanel();
        ui.loadFilterPanel();
    },

    loadOptionsPanel: function()
    {            
        var types = sketchfabClient.getOptionTypes();

        if(types != null)
        {
            for(i = 0; i < Object.keys(types).length; i++)
            { 
                var name = Object.keys(types)[i];
                var type_id = types[Object.keys(types)[i]];

                console.log('ui.loadOptionsPanel - name = ' + name);
                console.log('ui.loadOptionsPanel - type_id = ' + type_id);

                var new_button = this.generateButton(name);  
                new_button.onclick = ((button, instance_id) => 
                { 
                    return function() 
                    {
                        ui.openChoicePanel(instance_id);
                        if (button.classList.contains('option-type-selected'))
                        {
                            button.classList.remove('option-type-selected');
                        } else 
                        {
                            var buttonss = document.getElementsByClassName('option-type-selected');

                            // having to do this because getElementsByClassName returns a collection
                            // which isnt iterable with forEach
        
                            var buttons = Array.from(buttonss, button => button);
        
                            buttons.forEach( element =>
                            {
                                element.classList.remove('option-type-selected');
                            });
        
                            button.classList.add('option-type-selected');
                        }
                    };
                })(new_button, type_id);

                document.getElementById('option-types-panel').appendChild(new_button);
            }

            document.getElementById('option-types-panel').classList.add('option-types-panel-load-in');
        }
    },

    generateButton: function(_text) {

        var button = document.createElement('button');
        button.id = _text;
        button.className = 'options-button';
    
        var button_text_box = document.createElement('div');
        button_text_box.className = 'name-display';
    
        var button_text = document.createElement('span');
        button_text.className = 'button-text';
        button_text.innerHTML = _text;
    
        button_text_box.appendChild(button_text);
        button.appendChild(button_text_box);
    
        return button;
    },    

    loadFilterPanel: function() {

        var filters = sketchfabClient.getFilters();

        console.log('ui.loadFilterPanel - filters = ' + filters);

        filters.forEach(element => {

            let filter_button = document.createElement('button');
            filter_button.id = element;
            filter_button.className = 'options-button';
            filter_button.onclick = (event => { ui.setFilter(event); });
    
            let filter_button_text_box = document.createElement('div');
            filter_button_text_box.className = 'name-display';

            let filter_button_text = document.createElement('span');
            filter_button_text.className = 'button-text';
            filter_button_text.innerHTML = element;

            filter_button_text_box.appendChild(filter_button_text);
            filter_button.appendChild(filter_button_text_box);
            document.getElementById('filter-panel').appendChild(filter_button);
        });

        document.getElementById('filter-panel').classList.add('filter-panel-load-in');
    },

    openChoicePanel: function(_instance_id) {

        if (ui.active_panel_instance_id == null) {
            document.getElementById('options-panel').classList.remove('options-panel-hide');
            ui.populatePanel(_instance_id);
            document.getElementById('option-types-panel').classList.add('option-types-panel-shadowed');
            document.getElementById('options-panel').classList.add('options-panel-show');
        }
        else if(_instance_id != ui.active_panel_instance_id) {

            if(document.getElementById('options-panel').classList.contains('options-panel-show')) {
                document.getElementById('options-panel').classList.remove('options-panel-show');
                document.getElementById('option-types-panel').classList.remove('option-types-panel-shadowed');
                document.getElementById('options-panel').classList.add('options-panel-hide');

                setTimeout(() => { 
                    document.getElementById('options-panel').classList.remove('options-panel-hide');
                    ui.populatePanel(_instance_id);
                    document.getElementById('option-types-panel').classList.add('option-types-panel-shadowed');
                    document.getElementById('options-panel').classList.add('options-panel-show');
                }, 500);
            } else if(document.getElementById('options-panel').classList.contains('options-panel-hide')) {
                document.getElementById('options-panel').classList.remove('options-panel-hide');
                ui.populatePanel(_instance_id);
                document.getElementById('option-types-panel').classList.add('option-types-panel-shadowed');
                document.getElementById('options-panel').classList.add('options-panel-show');
            }

        } else {

            if(document.getElementById('options-panel').classList.contains('options-panel-show')) {
                document.getElementById('options-panel').classList.remove('options-panel-show');
                document.getElementById('option-types-panel').classList.remove('option-types-panel-shadowed');
                document.getElementById('options-panel').classList.add('options-panel-hide');
            } else if(document.getElementById('options-panel').classList.contains('options-panel-hide')) {
                document.getElementById('options-panel').classList.remove('options-panel-hide');
                document.getElementById('option-types-panel').classList.add('option-types-panel-shadowed');
                document.getElementById('options-panel').classList.add('options-panel-show');
            }
        }

        ui.active_panel_instance_id = _instance_id;
    },

    closeChoicePanel: function() {
        document.getElementById('options-panel').classList.remove('options-panel-show');
        document.getElementById('options-panel').classList.add('options-panel-hide');
        document.getElementById('option-types-panel').classList.remove('option-types-panel-shadowed');
        this.active_panel = null;
    },

    populatePanel: function(_type_instance_id)
    {
        console.log('ui.populatePanel - active panel index is ' + _type_instance_id);

        var buttonsText = '';
        var options = sketchfabClient.getOptions(_type_instance_id, this.current_filter);

        if(options != null)
        {
            for(i = 0; i < Object.keys(options).length; i++)
            {
                var name = Object.keys(options)[i];
                var option_id = options[name];
                buttonsText += '<button class="options-button" onclick="sketchfabClient.selectObject(' + _type_instance_id + ', ' + option_id + ')"><div class="name-display"><span class="button-text">' + Object.keys(options)[i] + '</span></div></button>';
            }

            document.getElementById('options-panel-content').innerHTML = buttonsText;
        } else {
            document.getElementById('options-panel-content').innerHTML = buttonsText;
            console.log("ui.populatePanel: Error - Options list is empty.");
        }
    },

    setFilter: function(event)
    {
        var filter_item = event.currentTarget;

        if(filter_item.classList.contains('filter-on'))
        {
            filter_item.classList.remove('filter-on');
            console.log(filter_item.id + " removed");

            var index = this.current_filter.indexOf(filter_item.id);

            if(index != -1)
            {
                this.current_filter.splice(index, 1);
                console.log(this.current_filter);
            }

        } else
        {
            filter_item.classList.add('filter-on');
            console.log(filter_item.id + " added");

            var index = this.current_filter.indexOf(filter_item.id);
            
            if(index == -1)
            {
                this.current_filter.push(filter_item.id);
                console.log(this.current_filter);
            }
        }

        console.log("ui.setFilter - active_panel = " + this.active_panel_instance_id);

        if(this.active_panel_instance_id != null)
        {
            console.log("ui.setFilter - active_panel non-null");
            console.log(" ~ active_panel = " + this.active_panel_instance_id);
            this.populatePanel(this.active_panel_instance_id);   
        }
    }
};