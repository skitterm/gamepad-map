 var hasGP = false;
 var mymap = null;
 var mapResponse = null;
 var titleHidden = false;
 var helpHidden = true;
 var isBusyShowing = false;
 var isBusyBookmark = false;

 var webmapgallery = ['4778fee6371d4e83a22786029f30c7e1', 'c63cdcbbba034b62a2f3becac021b0a8', 'd94dcdbe78e141c2b2d3a91d5ca8b9c9', 'ef5920f160bd4239bdeb1348de3a3156', '8a567ebac15748d39a747649a2e86cf4',
     '2618187b305f4eafbae8fd6eb52afc76'
 ];

 //webmapgallery = [];


 var basemapTypes = ['streets', 'satellite', 'hybrid', 'topo', 'gray', 'oceans', 'national-geographic', 'osm'];
 var basemapIndex = 0;
 var bookmarkIndex = 0;
 var mapIndex = 0,
     overviewMapDijit,
     isBusy = false;

 require([
     "dojo/ready",
     "esri/map",
     "esri/dijit/OverviewMap",
     "esri/arcgis/Portal",
     "esri/urlUtils",
     "esri/arcgis/utils"
 ], function(ready,
     Map,
     OverviewMap,
     Portal,
     urlUtils,
     arcgisUtils) {

     ready(function() {

         'use strict';
         //get webmap id
         var webmapid = "d94dcdbe78e141c2b2d3a91d5ca8b9c9";
         var groupid = "f4373b6eae144e26a634937269d336ec";

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
                     if(results.length>0) {
                        webmapgallery = [];
                        for (var i = results.length - 1; i >= 0; i--) {
                            var result = results[i];
                            if(result.type == "Web Map") {
                                webmapgallery.push(result.id);
                            }
                        }
                        loadMap(webmapgallery[0]);
                     } else {
                         alert("Sorry, no webmaps are available in this group. Loading a default map.");
                        loadMap(webmapid);
                     }
                 }, function(err){
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
     if (mymap) {
         mymap.destroy();
         basemapIndex = 0;
         bookmarkIndex = 0;
         if (overviewMapDijit) overviewMapDijit.destroy();
         dojo.byId('bookmarks').style.display = 'none';
         dojo.byId("title").innerHTML = "Loading ...";
     }

     esri.arcgis.utils.createMap(webmapid, "mapdiv").then(function(response) {

         dojo.byId("title").innerHTML = "<h3>" + response.itemInfo.item.title + "</h3>";
         mymap = response.map;
         mymap.hideZoomSlider();
         mapResponse = response;
         mymap.initialExtent = mymap.extent;


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
         document.getElementById('connect-status').className = 'connected';
         timer = window.setInterval(checkGamepad, 100);
     });
     window.addEventListener('gamepaddisconnected', function() {
         window.clearInterval(timer);
         document.getElementById('connect-status').className = 'disconnected';
     });

     //setup an interval for Chrome
     var checkGP = window.setInterval(function() {
         if (navigator.getGamepads()[0]) {
             if (!hasGP) {
                 document.getElementById('connect-status').className = 'connected';
                 timer = window.setInterval(checkGamepad, 100);
             }
             window.clearInterval(checkGP);
         } else {
             document.getElementById('connect-status').className = 'disconnected';
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
                     break;
                 case 10:
                     buttonName = "A";
                     break;
                 case 11:
                     buttonName = "A";
                     break;
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

 function hasBookmarks() {

     // if there are any...     
     var bookmarks = mapResponse.itemInfo.itemData.bookmarks;
     if (bookmarks && bookmarks.length > 0) {
         overviewMapDijit.show();
         document.getElementById('bookmarks').style.display = "inline-block";
         document.getElementById('bookmarks').innerHTML = bookmarks.length + " Bookmarks available! Press B to get started.";
     } else {
         overviewMapDijit.hide();
     }
 }

 function displayBookmark() {

     console.log("inside display book marks: isbusy " + isBusyBookmark);

     if (isBusyBookmark) return;

     var bookmarks = mapResponse.itemInfo.itemData.bookmarks;
     if (bookmarks && bookmarks.length > 0) {
         console.log("Changing bookmark");
         isBusyBookmark = true;
         // set this to do.
         if (bookmarkIndex > bookmarks.length - 1) {
             document.getElementById('bookmarks').style.display = 'none';
             overviewMapDijit.hide();
             bookmarkIndex = 0;
             mymap.setExtent(mymap.initialExtent);
         } else {
             // set extent
             //console.log('showing bookmark ' + (bookmarkIndex + 1));
             overviewMapDijit.show();
             document.getElementById('bookmarks').style.display = 'inline-block';
             document.getElementById('bookmarks').innerHTML = "Showing Bookmark " + (bookmarkIndex + 1) + ' of ' + bookmarks.length;
             var newExtent = new esri.geometry.Extent(bookmarks[bookmarkIndex].extent);
             mymap.setExtent(newExtent, true);
             bookmarkIndex++;
         }
         setTimeout(function() {
             isBusyBookmark = false;
         }, 1000);
     }

 }

 function toggleHelp() {
     if (isBusyShowing) {
         return;
     }
     // set to busy.
     // start timer.    
     isBusyShowing = true;

     if (!titleHidden && helpHidden) {
         // show help as well as title
         helpHidden = false;
         document.getElementById('help-pics').style.display = 'block';
     } else if (!titleHidden && !helpHidden) {
         // hide title and help
         titleHidden = true;
         helpHidden = true;
         document.getElementById('header').style.display = 'none';
         document.getElementById('help-pics').style.display = 'none';
     } else {
         // show title but not help
         titleHidden = false;
         document.getElementById('header').style.display = 'block';
     }
     window.setTimeout(waitWhileBusy(), 500);
 }

 function waitWhileBusy() {
     isBusyShowing = false;
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
             mymap.setLevel(mymap.getLevel() + 1);
             break;
         case 'zoomout':
             mymap.setLevel(mymap.getLevel() - 1);
             break;
         case 'panup':
             mymap.panUp();
             break;
         case 'pandown':
             mymap.panDown();
             break;
         case 'panleft':
             mymap.panLeft();
             break;
         case 'panright':
             mymap.panRight();
             break;
         case 'panupright':
             mymap.panUpperRight();
             break;
         case 'pandownright':
             mymap.panLowerRight();
             break;
         case 'panupleft':
             mymap.panUpperLeft();
             break;
         case 'pandownleft':
             mymap.panLowerLeft();
             break;
         case 'reset':
             mymap.setExtent(mymap.initialExtent);
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