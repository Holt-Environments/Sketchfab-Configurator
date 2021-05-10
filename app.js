/**
 * Holt Environments
 * Anthony Mesa
 * 
 * Custom sketchfab-customiser created for AstroTurf.
 * 
 * At some point it may make more sense to convert the sketchfabClient and ui objects into classes.
 */

//=======================================
// Global Control Variables
//=======================================

// FBX
//const SKETCHFAB_UID = '0901cb402a1d421f8900a8849bc3e125';

// Blender
const SKETCHFAB_UID = '20847769d06f47a582113b0df1c88990';

const CONTAINER_NAME = 'sketchfab-customiser';
const SKETCHFAB_IFRAME_ID = 'api-iframe';

//=======================================
// Initializing container code
//=======================================

/* First populate the sketchfab-customiser with the required elements for ui and sketchfab Iframe */
document.getElementById(CONTAINER_NAME).innerHTML +=

/* Main panel on left side. */
'<div id="option-types-panel" class="no-scrollbar no-scrollbar::-webkit-scrollbar"></div>' +

/* Popout options panel. */
'<div id="options-panel">' + 

    /* Panel close button. */
    //'<button id="close-panel" onclick="ui.closeChoicePanel()"></button>' +

    /* Panel container for options buttons. */
    '<div id="options-panel-content"></div>' +
'</div>' +

/* Panel on right for filtering options. */
'<div id="filter-panel"></div>' + 

/* Sketchfab iframe */
'<iframe id="'+ SKETCHFAB_IFRAME_ID +'" src="" style="width: 100%; height: 100%; z-index: 1;" allow="autoplay; fullscreen; vr" allowvr allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>';

//=======================================
// Sketchfab Client Object
//=======================================

var sketchfabClient = {
    
    /* API object */
    api: null,

    /* Object array of every element in the scene. */
    scene_tree: [],

    /* Hierarchical root object for easy access to objects in scene. */
    scene_root: null,

    init: function (iframe) {
        var client = new Sketchfab(iframe);

        client.init( SKETCHFAB_UID, {
            success: function onSuccess( api ){
                sketchfabClient.api = api;
                sketchfabClient.api.start();
                sketchfabClient.api.addEventListener( 'viewerready', function() {

                    /* This gets options from sketchfab and prints them out */
                    sketchfabClient.api.getNodeMap(function (err, nodes) {
                            if (err) {
                                console.error(err);
                                return;
                            }
                            
                            var node;
                            var keys = Object.keys(nodes);
                            for (var i = 0; i < keys.length; i++) {
                                node = nodes[keys[i]];
                                sketchfabClient.scene_tree.push({
                                    id: node.instanceID,
                                    name: node.name,
                                    type: node.type,
                                    selected: false,
                                    children: node.children,
                                    
                                    /* Technically this negates the need for storing the info above 
                                        because it is the same info, but this is just in case there
                                        is something we need to access that wasnt included for quick access. */
                                    data: node
                                });
                            }
        
                            console.log(sketchfabClient.scene_tree);

                            sketchfabClient.scene_root = sketchfabClient.scene_tree[1];
                            sketchfabClient.setInitialObjectsVisible();

                            /* Calling ui load here so that it runs after getNodeMap is complete. If ui.load() is
                                called outside of this function, then it can not be guaranteed that scenetree has
                                been asynchronously populated in time for the ui to load correctly. */

                            ui.load();

                    }.bind(this));
                });
            },
        
            error: function onError() {
                console.log( 'Viewer error' );
            }
        });
    },

    /**
     * This function is responsible for making sure that on load, only the first element of
     * each "type" is visible. Else, all objects in the scene will show up at once and overlap.
     */
    setInitialObjectsVisible: function() {
        for(i = 0; i < sketchfabClient.scene_root.children.length; i++) {

            sketchfabClient.selectObject(i, sketchfabClient.scene_root.children[i].children[0].instanceID);
            sketchfabClient.translateObject(sketchfabClient.scene_root.children[i].instanceID, [0.0, 0.0, 0.0]);
        }
    },

    /**
     * Selects the object given by root index and submenu id by showing said object
     * and hiding all others within the type group.
     * 
     * @param {number} _root_index Index of type group in root to iterate over
     * @param {number} _element_id Index of object in type group to be shown
     */
    selectObject: function(_root_index, _element_id) {

        console.log("root index - " + _root_index);
        
        for(j = 0; j < sketchfabClient.scene_root.children[_root_index].children.length; j++) {

            var id = sketchfabClient.scene_root.children[_root_index].children[j].instanceID;

            if (id == _element_id) {
                sketchfabClient.api.show(id);
            }
            else {
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

    getOptionTypes: function() {

        var types = [];

        for(i = 0; i < this.scene_root.children.length; i++) {
            types.push(this.scene_root.children[i].name.split('_')[0]);
        }

        return types;
    },

    getOptions: function(_index, _filter) {
        
        var options = {};

        /* Iterate across the options available for the type group given as index. */
        for(i = 0; i < this.scene_root.children[_index].children.length; i++) {

            /* 'type-name_01' => 'type-name' */
            var typeName = this.scene_root.children[_index].name.split('_')[0];
            
            /* 'type-name option-name # filter1 filter2 filter3_01' => [type-name, option-name, #, filter1, filter2, filter3] */
            var optionName = this.scene_root.children[_index].children[i].name.split('_')[0].split(" ");

            if (typeName == optionName[0]) {
                /* [type-name, option-name, #, filter1, filter2, filter3] => [option-name, #, filter1, filter2, filter3] */
                optionName.shift();
            } else {
                console.log("sketchfabClient.getOptions: Error - Naming convention issue discovered in object hierarchy.");
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

                                var id =  this.scene_root.children[_index].children[i].instanceID;

                                console.log("id - " + id);

                                if(!(option_name in options)) { options[option_name] = id; }
                            }
                        });
                    });

                } else {
                    var option_name = optionName.join(' ');

                    var id =  this.scene_root.children[_index].children[i].instanceID;

                    if(!(option_name in options)) { options[option_name] = id; }
                }
            } else {
                console.log('filter doesnt exist');

                var filter_index = optionName.indexOf('#');

                if(filter_index != -1) {
                    var option_name = optionName.slice(0, filter_index).join(' ');
                                
                    var id =  this.scene_root.children[_index].children[i].instanceID;

                    if(!(option_name in options)) { options[option_name] = id; }
                } else {
                    var option_name = optionName.join(' ');

                    var id =  this.scene_root.children[_index].children[i].instanceID;

                    if(!(option_name in options)) { options[option_name] = id; };
                }
            }
        }

        console.log(options);

        return options;
    }
};

/* After defining the object, we can now initialize the sketchfabClient. */
sketchfabClient.init( document.getElementById( SKETCHFAB_IFRAME_ID ) );

//=======================================
// ui object
//=======================================

var ui = {

    /* Index of active element in root being viewed */
    active_panel: null,

    filter_options: ['normal', 'fun'],

    current_filter: [],

    /* Loads the ui dynamically depending on the elements in the sketchfab view. */
    load: function( /*_options*/) {

        ui.loadOptionsPanel();
        ui.loadFilterPanel();
    },


    loadOptionsPanel: function() {
                
        var types = sketchfabClient.getOptionTypes();

        for(i = 0; i < types.length; i++) { 

            var new_button = this.generateButton(types[i]);
            
            new_button.onclick = ((button, opt) => { 
                return function() {
                    ui.openChoicePanel(opt);
                    
                    if(button.classList.contains('option-type-selected')) {
                        button.classList.remove('option-type-selected');
                    } else {
                        var buttonss = document.getElementsByClassName('option-type-selected');

                        // having to do this because getElementsByClassName returns a collection
                        // which isnt iterable with forEach
    
                        var buttons = Array.from(buttonss, button => button);
    
                        buttons.forEach( element => {
                            element.classList.remove('option-type-selected');
                        });
    
                        button.classList.add('option-type-selected');
                    }
                 };
            })(new_button, i);

            document.getElementById('option-types-panel').appendChild(new_button);
        }

        document.getElementById('option-types-panel').classList.add('option-types-panel-load-in');
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
        this.filter_options.forEach(element => {

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

    openChoicePanel: function(_index) {

        if (this.active_panel == null) {
            document.getElementById('options-panel').classList.remove('options-panel-hide');
            ui.populatePanel(_index);
            document.getElementById('option-types-panel').classList.add('option-types-panel-shadowed');
            document.getElementById('options-panel').classList.add('options-panel-show');
        }
        else if(_index != this.active_panel) {

            if(document.getElementById('options-panel').classList.contains('options-panel-show')) {
                document.getElementById('options-panel').classList.remove('options-panel-show');
                document.getElementById('option-types-panel').classList.remove('option-types-panel-shadowed');
                document.getElementById('options-panel').classList.add('options-panel-hide');

                setTimeout(() => { 
                    document.getElementById('options-panel').classList.remove('options-panel-hide');
                    ui.populatePanel(_index);
                    document.getElementById('option-types-panel').classList.add('option-types-panel-shadowed');
                    document.getElementById('options-panel').classList.add('options-panel-show');
                }, 500);
            } else if(document.getElementById('options-panel').classList.contains('options-panel-hide')) {
                document.getElementById('options-panel').classList.remove('options-panel-hide');
                ui.populatePanel(_index);
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

        this.active_panel = _index;
    },

    closeChoicePanel: function() {
        document.getElementById('options-panel').classList.remove('options-panel-show');
        document.getElementById('options-panel').classList.add('options-panel-hide');
        document.getElementById('option-types-panel').classList.remove('option-types-panel-shadowed');
        this.active_panel = null;
    },

    populatePanel: function(_index) {
        console.log('ui.populatePanel - active panel index is ' + _index);

        /* Will be for-eaching across all options */
        var buttonsText = '';
        var options = sketchfabClient.getOptions(_index, this.current_filter);

        if(options != null) {
            for(i = 0; i < Object.keys(options).length; i++) {
                buttonsText += '<button class="options-button" onclick="sketchfabClient.selectObject(' + _index + ', ' + options[Object.keys(options)[i]] + ')"><div class="name-display"><span class="button-text">' + Object.keys(options)[i] + '</span></div></button>';
            }

            document.getElementById('options-panel-content').innerHTML = buttonsText;
        } else {
            document.getElementById('options-panel-content').innerHTML = buttonsText;
            console.log("ui.populatePanel: Error - Options list is empty.");
        }
    },

    setFilter: function(event) {
        var filter_item = event.currentTarget;

        if(filter_item.classList.contains('filter-on')) {
            filter_item.classList.remove('filter-on');
            console.log(filter_item.id + " removed");

            var index = this.current_filter.indexOf(filter_item.id);

            if(index != -1) {
                this.current_filter.splice(index, 1);
                console.log(this.current_filter);
            }

        } else {
            filter_item.classList.add('filter-on');
            console.log(filter_item.id + " added");

            var index = this.current_filter.indexOf(filter_item.id);
            
            if(index == -1) {
                this.current_filter.push(filter_item.id);
                console.log(this.current_filter);
            }
        }

        if(this.active_panel != null) {
            this.populatePanel(this.active_panel);   
        }
    }
};