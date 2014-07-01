 var hasGP = false;
 var mymap = null;
 var mapResponse = null;
 var helpHidden = false;
 var isButtonBusy = false;
 var showingLegend = false;
 var showingTitleBar = true;
 var originalHelpText = '';
 var changedOriginalText = true;

 var webmapgallery = ['d94dcdbe78e141c2b2d3a91d5ca8b9c9', '4778fee6371d4e83a22786029f30c7e1', 'c63cdcbbba034b62a2f3becac021b0a8', 'ef5920f160bd4239bdeb1348de3a3156',
     '8a567ebac15748d39a747649a2e86cf4', '2618187b305f4eafbae8fd6eb52afc76'
 ];

 //webmapgallery = [];


 var basemapTypes = ['streets', 'satellite', 'hybrid', 'topo', 'gray', 'oceans', 'national-geographic', 'osm'];
 var basemapIndex = 0;
 var bookmarkIndex = 0;
 var mapIndex = 0;
 var legendDijit;
 var overviewMapDijit;
 var isBusy = false;

 require([
     "dojo/ready",
     "esri/map",
     'esri/dijit/Legend',
     "esri/dijit/OverviewMap",
     "esri/arcgis/Portal",
     "esri/urlUtils",
     "esri/arcgis/utils"
 ], function(ready,
     Map,
     Legend,
     OverviewMap,
     Portal,
     urlUtils,
     arcgisUtils) {

     ready(function() {

         'use strict';
         //get webmap id
         var webmapid = 'd94dcdbe78e141c2b2d3a91d5ca8b9c9';
         var groupid = 'f4373b6eae144e26a634937269d336ec';

         var hrefObject = esri.urlToObject(document.location.href);
         if (hrefObject.query && hrefObject.query.webmap) {
             webmapid = hrefObject.query.webmap;
         }

         if (hrefObject.query && hrefObject.query.groupid) {
             groupid = hrefObject.query.groupid;
         }

         if (groupid) {

             console.log("using groupid: " + groupid);

             var portal = new esri.arcgis.Portal('http://www.arcgis.com');
             portal.on("load", function() {
                 var params = {
                     q: 'group:' + groupid + " AND " + "type:Web Map"
                 };
                 portal.queryItems(params).then(function(items) {
                     var results = items.results;
                     if (results.length > 0) {
                         webmapgallery = [];
                         for (var i = results.length - 1; i >= 0; i--) {
                             var result = results[i];
                             if (result.type == "Web Map") {
                                 webmapgallery.push(result.id);
                             }
                         }
                         loadMap(webmapgallery[0]);
                     } else {
                         alert("Sorry, no webmaps are available in this group. Loading a default map.");
                         loadMap(webmapid);
                     }
                 }, function(err) {
                     console.log(err);
                     alert("Sorry, could not load the group items. Loading a default map.");
                     loadMap(webmapid);
                 });
             });

         } else {
             //add the map
             loadMap(webmapid);
         }



     });

 });


 function loadMap(webmapid) {
     require(['dojo/_base/array'], function(arrayUtils) {
         if (mymap) {
             mymap.destroy();
             //legendDijit.destroy();
             dojo.byId('legend-div').style.display = "none";
             basemapIndex = 0;
             bookmarkIndex = 0;
             if (overviewMapDijit) overviewMapDijit.destroy();
             dojo.byId('bookmarks').style.display = 'none';
             dojo.byId('help-text').innerHTML = '';
             dojo.byId("title").innerHTML = "Loading ...";
         }

         esri.arcgis.utils.createMap(webmapid, "mapdiv").then(function(response) {

             dojo.byId("title").innerHTML = "<h3>" + response.itemInfo.item.title + "</h3>";
             mymap = response.map;

             mymap.hideZoomSlider();
             mapResponse = response;
             mymap.initialExtent = mymap.extent;

             var legendLayers = esri.arcgis.utils.getLegendLayers(response);

             //set basemap layerids
             if (mymap.basemapLayerIds && mymap.basemapLayerIds.length > 0) {
                 //good to go
             } else {
                 mymap.basemapLayerIds = [];
                 for (var i = 0; i < mapResponse.itemInfo.itemData.baseMap.baseMapLayers.length; i++) {
                     mymap.basemapLayerIds.push(mapResponse.itemInfo.itemData.baseMap.baseMapLayers[i].id);
                 };
             }


             isBusy = false;
             //call gamepadinit
             var layers = [];

             if (legendDijit) {
                legendDijit.layerInfos = legendLayers;
                legendDijit.refresh();
             } else {
                 legendDijit = new esri.dijit.Legend({
                     map: mymap,
                     layerInfos: legendLayers
                 }, 'legend-div');
                 legendDijit.startup();
             }


             overviewMapDijit = new esri.dijit.OverviewMap({
                 map: mymap,
                 attachTo: "bottom-left",
                 color: " #D84E13",
                 opacity: .40
             });

             overviewMapDijit.startup();

             hasBookmarks();

             initializeGamePad();
         }, function(err) {
             console.log(err);
             isBusy = false;
         });
     });
 }


 function canGame() {
     return "getGamepads" in navigator;
 }

 window.requestAnimFrame = (function() {
     return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         function(callback) {
             window.setTimeout(callback, 1000 / 60);
         };
 })();



 function initializeGamePad() {

     if (mymap == null) {
         alert("map is null");
         return;
     }

     if (hasGP) return;

     var gp = navigator.getGamepads()[0];
     var timer = null;


     window.addEventListener('gamepadconnected', function() {
         hasGP = true;
         dojo.byId('connect-status').className = 'connected';
         timer = window.setInterval(checkGamepad, 100);
     });
     window.addEventListener('gamepaddisconnected', function() {
         window.clearInterval(timer);
         dojo.byId('connect-status').className = 'disconnected';
     });

     //setup an interval for Chrome
     var checkGP = window.setInterval(function() {
         if (navigator.getGamepads()[0]) {
             if (!hasGP) {
                 dojo.byId('connect-status').className = 'connected';
                 timer = window.setInterval(checkGamepad, 100);
             }
             window.clearInterval(checkGP);
         } else {
             dojo.byId('connect-status').className = 'disconnected';
         }
     }, 500);
     //requestAnimFrame(checkGamepad);
 }

 function checkGamepad() {
     // we only want one gamepad controlling the map
     var gamepad = navigator.getGamepads()[0];

     if (canGame()) {
         pollButtons(gamepad);
         checkAxes(gamepad);
     }
 }

 function pollButtons(gamepad) {
     for (var i = 0; i < gamepad.buttons.length; i++) {
         if (gamepad.buttons[i].pressed) {
             var buttonName = '';

             if (i < 12) {
                 if (isButtonBusy) return;
                 isButtonBusy = true;

                 switch (i) {
                     case 0:
                         buttonName = "A";
                         toggleHelp();
                         break;
                     case 1:
                         buttonName = "B";
                         displayBookmark();
                         break;
                     case 2:
                         buttonName = "X";
                         mapAction('switchBasemap');
                         break;
                     case 3:
                         buttonName = "Y";
                         toggleLegend();
                         break;
                     case 4:
                         buttonName = "Left top trigger";
                         mapAction('previousMap');
                         break;
                     case 5:
                         buttonName = "Right top trigger";
                         mapAction('nextMap');
                         break;
                     case 6:
                         buttonName = "Left bottom trigger";
                         mapAction('zoomout');
                         break;
                     case 7:
                         buttonName = "Right bottom trigger";
                         mapAction('zoomin');
                         break;
                     case 8:
                         buttonName = "Back";
                         mapAction('reset');
                         break;
                     case 9:
                         buttonName = "Start";
                         toggleTitleBar();
                         break;
                     case 10:
                         buttonName = "A";
                         break;
                     case 11:
                         buttonName = "A";
                         break;
                     default:
                         break;
                 }

                 setTimeout(function() {
                     isButtonBusy = false;
                 }, 200);

             } else {
                 switch (i) {
                     case 12:
                         buttonName = "Up";
                         mapAction('panup');
                         break;
                     case 13:
                         buttonName = "Down";
                         mapAction('pandown');
                         break;
                     case 14:
                         buttonName = "Left";
                         mapAction('panleft');
                         break;
                     case 15:
                         buttonName = "Right";
                         mapAction('panright');
                         break;
                     default:
                         break;
                 }
             }
         }
     }
 }

 function toggleTitleBar() {
     if (showingTitleBar) {
         dojo.byId('header').style.display = "none";
     } else {
         dojo.byId('header').style.display = "inline-block";
     }
     showingTitleBar = !showingTitleBar;
 }

 function toggleLegend() {
     if (showingLegend) {
         dojo.byId('legend-div').style.display = "none";
     } else {
         dojo.byId('legend-div').style.display = "inline-block";
     }
     showingLegend = !showingLegend;
 }

 function hasBookmarks() {

     // if there are any...     
     var bookmarks = mapResponse.itemInfo.itemData.bookmarks;
     if (bookmarks && bookmarks.length > 0) {
         overviewMapDijit.show();
         dojo.byId('bookmarks').style.display = "inline-block";
         var pluralSuffix = bookmarks.length > 1 ? 's' : '';
         var bookmarkText = bookmarks.length + ' Bookmark' + pluralSuffix + ' available! Press B to get started.';
         dojo.byId('help-text').innerHTML = bookmarkText;
     } else {
         dojo.byId('help-text').innerHTML = '';
         overviewMapDijit.hide();
     }
 }

 function displayBookmark() {
     var bookmarks = mapResponse.itemInfo.itemData.bookmarks;
     if (bookmarks && bookmarks.length > 0) {
         console.log("Changing bookmark");
         // set this to do.
         if (bookmarkIndex > bookmarks.length - 1) {
             dojo.byId('bookmarks').style.display = 'none';
             overviewMapDijit.hide();
             bookmarkIndex = 0;
             var pluralSuffix = bookmarks.length > 1 ? 's' : '';
             var bookmarkText = bookmarks.length + ' Bookmark' + pluralSuffix + ' available! Press B to get started.';
             dojo.byId('help-text').innerHTML = bookmarkText;
             mymap.setExtent(mymap.initialExtent);
         } else {
             // set extent
             //console.log('showing bookmark ' + (bookmarkIndex + 1));
             overviewMapDijit.show();
             dojo.byId('bookmarks').style.display = 'inline-block';
             dojo.byId('help-text').innerHTML = "Showing Bookmark " + (bookmarkIndex + 1) + ' of ' + bookmarks.length;
             var newExtent = new esri.geometry.Extent(bookmarks[bookmarkIndex].extent);
             mymap.setExtent(newExtent, true);
             bookmarkIndex++;
         }
     }
 }

 function toggleHelp() {
     if (helpHidden) {
         dojo.byId('help-pics').style.display = 'block';
     } else {
         dojo.byId('help-pics').style.display = 'none';
     }
     helpHidden = !helpHidden;
 }

 function checkAxes(gamepad) {
     var axesActions = {
         leftZoomIn: false,
         leftZoomOut: false,
         rightZoomIn: false,
         rightZoomOut: false,

         panUp: false,
         panDown: false,
         panLeft: false,
         panRight: false,
         panUpLeft: false,
         panUpRight: false,
         panDownLeft: false,
         panDownRight: false
     };

     for (var i = 0; i < gamepad.axes.length; i += 2) {
         var x = gamepad.axes[i];
         var y = gamepad.axes[i + 1];

         var diffNeg = -0.4;
         var diffPos = 0.4;

         // check the right analog stick
         if (i > 1) {
             if (x > diffPos && y > diffPos) {
                 axesActions.rightZoomIn = true;
             } else if (x < diffNeg && y < diffNeg) {
                 axesActions.rightZoomOut = true;
             }
         }
         // left analog stick
         else {
             if (x > diffPos && y > diffPos) {
                 axesActions.panDownRight = true;
             } else if (x < diffNeg && y < diffNeg) {
                 axesActions.panUpLeft = true;
             } else if (x > diffPos && y < diffNeg) {
                 // account for each of the 
                 axesActions.panUpRight = true;
             } else if (x < diffNeg && y > diffPos) {
                 axesActions.panDownLeft = true;
             } else if (x < diffNeg && y < diffPos && y > diffNeg) {
                 axesActions.panLeft = true;
             } else if (x > diffPos && y < diffPos && y > diffNeg) {
                 axesActions.panRight = true;
             } else if (y > diffPos && x < diffPos && x > diffNeg) {
                 axesActions.panDown = true;
             } else if (y < diffNeg && x < diffPos && x > diffNeg) {
                 axesActions.panUp = true;
             }
         }
     }

     checkAxesActions(axesActions);
 }

 function checkAxesActions(axesActions) {
     if (axesActions.panDownRight) {
         mapAction('pandownright');
     } else if (axesActions.panUpRight) {
         mapAction('panupright');
     } else if (axesActions.panDownLeft) {
         mapAction('pandownleft');
     } else if (axesActions.panUpLeft) {
         mapAction('panupleft');
     } else if (axesActions.panLeft) {
         mapAction('panleft');
     } else if (axesActions.panRight) {
         mapAction('panright');
     } else if (axesActions.panUp) {
         mapAction('panup');
     } else if (axesActions.panDown) {
         mapAction('pandown');
     }
 }

 function mapAction(type) {

     if (isBusy) return;

     console.log(type);

     switch (type) {
         case 'zoomin':
             setPanZoomHelpText();
             mymap.setLevel(mymap.getLevel() + 1);
             break;
         case 'zoomout':
             setPanZoomHelpText();
             mymap.setLevel(mymap.getLevel() - 1);
             break;
         case 'panup':
             setPanZoomHelpText();
             mymap.panUp();
             break;
         case 'pandown':
             setPanZoomHelpText();
             mymap.panDown();
             break;
         case 'panleft':
             setPanZoomHelpText();
             mymap.panLeft();
             break;
         case 'panright':
             setPanZoomHelpText();
             mymap.panRight();
             break;
         case 'panupright':
             setPanZoomHelpText();
             mymap.panUpperRight();
             break;
         case 'pandownright':
             setPanZoomHelpText();
             mymap.panLowerRight();
             break;
         case 'panupleft':
             setPanZoomHelpText();
             mymap.panUpperLeft();
             break;
         case 'pandownleft':
             setPanZoomHelpText();
             mymap.panLowerLeft();
             break;
         case 'reset':
             dojo.byId('help-text').innerHTML = originalHelpText;
             mymap.setExtent(mymap.initialExtent);
             changedOriginalText = true;
             break;
         case 'switchBasemap':
             switchBasemap();
             break;
         case 'previousMap':
             --mapIndex;
             if (mapIndex < 0) {
                 mapIndex = webmapgallery.length - 1;
             }
             isBusy = true;
             loadMap(webmapgallery[mapIndex]);
             break;
         case 'nextMap':
             ++mapIndex;
             if (mapIndex > webmapgallery.length - 1) {
                 mapIndex = 0;
             }
             isBusy = true;
             loadMap(webmapgallery[mapIndex]);
             break;
         default:
             break;
     }
 }

 function setPanZoomHelpText() {
     if (changedOriginalText) {
         originalHelpText = dojo.byId('help-text').innerHTML;
         dojo.byId('help-text').innerHTML = 'Press "back" to return to original extent.';
         changedOriginalText = false;
     }
 }

 function switchBasemap() {
     mymap.setBasemap(basemapTypes[basemapIndex % basemapTypes.length]);
     basemapIndex++;
 }

 window.onload = (function() {


     //initializeGamePad();

     //https://developer.mozilla.org/en-US/docs/Web/Guide/API/Gamepad
     /* TODO
         window.addEventListener("gamepadconnected", function(e) {
             console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                 e.gamepad.index, e.gamepad.id,
                 e.gamepad.buttons.length, e.gamepad.axes.length);
         });
    */

 });