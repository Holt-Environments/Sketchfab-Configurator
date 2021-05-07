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

const CONTAINER_NAME = 'sketchfab-customiser';
// FBX
//const SKETCHFAB_UID = '0901cb402a1d421f8900a8849bc3e125';
// Blender
const SKETCHFAB_UID = '20847769d06f47a582113b0df1c88990';
const SKETCHFAB_IFRAME_ID = 'api-iframe';

//=======================================
// Initializing container code
//=======================================

/* First populate the sketchfab-customiser with the required elements for UI and sketchfab Iframe */
document.getElementById(CONTAINER_NAME).innerHTML +=
'<div id="option-types-panel" class="no-scrollbar no-scrollbar::-webkit-scrollbar"></div>' +
'<div id="options-panel">' + 
    '<button id="close-panel" onclick="UI.closeChoicePanel()"></button>' +
    '<div id="options-panel-content"></div>' +
'</div>' +
'<div id="filter-panel"></div>' + 
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

                            /* Calling UI load here so that it runs after getNodeMap is complete. If UI.load() is
                                called outside of this function, then it can not be garunteed that scenetree has
                                been populated in time asynchronously for the UI to load correctly. */

                            UI.load();

                    }.bind(this));
                });
            },
        
            error: function onError() {
                console.log( 'Viewer error' );
            }
        });
    },

    setInitialObjectsVisible: function() {
        for(i = 0; i < sketchfabClient.scene_root.children.length; i++) {

            sketchfabClient.selectObject(i, 0);
            sketchfabClient.setPosition(sketchfabClient.scene_root.children[i].instanceID);
        }
    },

    selectObject: function(_root_index, _submenu_id) {

        for(j = 0; j < sketchfabClient.scene_root.children[_root_index].children.length; j++) {

            var id = sketchfabClient.scene_root.children[_root_index].children[j].instanceID;

            if (_submenu_id == j) {
                sketchfabClient.api.show(id);
            }
            else {
                sketchfabClient.api.hide(id);
            }
        }
    },

    setPosition: function(myNode) {
        sketchfabClient.api.translate(myNode, [0.0, 0.0, 0.0], {
            duration: 1.0,
            easing: 'easeOutQuad'
        }, function(err, translateTo) {
            if (!err) {
                window.console.log('Object has been translated to', translateTo);
            }
        });
    }
};

/* After defining the object, we can now initialize the sketchfabClient. */
sketchfabClient.init( document.getElementById( SKETCHFAB_IFRAME_ID ) );

//=======================================
// UI object
//=======================================

var UI = {

    /* Index of active element in root being viewed */
    active_panel: null,

    /* Loads the UI dynamically depending on the elements in the sketchfab view. */
    load: function( /*_options*/) {

        this.root = sketchfabClient.scene_tree[1];
        UI.loadOptionsPanel();
        UI.loadFilterPanel();
    },

    loadOptionsPanel: function() {
        document.getElementById('option-types-panel').classList.add('option-types-panel-load-in');
        
        /* Will be for-eaching across all options */
        var buttonsText = '';
        for(i = 0; i < this.root.children.length; i++) {
            buttonsText += '<button class="options-button" onClick="UI.openChoicePanel(\'' + i + '\')"><div class="name-display"><span class="button-text">' + sketchfabClient.scene_root.children[i].name + '</span></div></button>';
        }

        document.getElementById('option-types-panel').innerHTML = buttonsText;
    },

    loadFilterPanel: function() {
        var filterButtons = '' +
        '<button class="options-button">normal</button>' +
        '<button class="options-button">crazy</button>';

        document.getElementById('filter-panel').innerHTML = filterButtons;
        document.getElementById('filter-panel').classList.add('filter-panel-load-in');
    },

    openChoicePanel: function(_index) {

        if (this.active_panel == null) {
            UI.populatePanel(_index);
            document.getElementById('options-panel').classList.remove('options-panel-hide');
            document.getElementById('option-types-panel').classList.add('option-types-panel-shadowed');
            document.getElementById('options-panel').classList.add('options-panel-show');
        }
        else if(_index != this.active_panel) {
            document.getElementById('options-panel').classList.remove('options-panel-show');
            document.getElementById('option-types-panel').classList.remove('option-types-panel-shadowed');
            document.getElementById('options-panel').classList.add('options-panel-hide');

            setTimeout(() => { 
                UI.populatePanel(_index);

                document.getElementById('options-panel').classList.remove('options-panel-hide');
                document.getElementById('option-types-panel').classList.add('option-types-panel-shadowed');
                document.getElementById('options-panel').classList.add('options-panel-show');
            }, 500);

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
        
        /* Will be for-eaching across all options */
        var buttonsText = '';

        for(i = 0; i < this.root.children[_index].children.length; i++) {
            buttonsText += '<button class="options-button" onClick="sketchfabClient.selectObject(' + _index + ', ' + i + ')"><div class="name-display"><span class="button-text">' + sketchfabClient.scene_root.children[_index].children[i].name + '</span></div></button>';
        }

        document.getElementById('options-panel-content').innerHTML = buttonsText;
    },
};