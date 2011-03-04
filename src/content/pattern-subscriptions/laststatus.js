/**
  FoxyProxy
  Copyright (C) 2006-#%#% Eric H. Jung and LeahScape, Inc.
  http://getfoxyproxy.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

"use strict";

function onLoad() {
  var errorMessages = [], status, i, treeChildren = []; 
  status = window.arguments[0].inn.status;
  if (window.arguments[0].inn.errorMessages) {
    errorMessages = window.arguments[0].inn.errorMessages;
  }
  // Preparing the treeChildren to simplify the logic needed in the view 
  // itself.
  treeChildren.push(status);
  if (errorMessages) {
    treeChildren.push("");
    for (i = 0; i < errorMessages.length; i++) {
      treeChildren.push(errorMessages[i]);
    } 
  }
  var statusTree = document.getElementById("lastStatusTree");
  statusTree.view = {
    get rowCount() {
      if (!errorMessages) {
        return 1;
      } else {
        // One additional line for the status message and one is an empty line
        // that separates the status message from the error messages.
        return errorMessages.length + 2;
      }
    },
    getCellText : function(row,column){
      return treeChildren[row];
    },
    setTree: function(treebox){},
    getColumnProperties: function(col, elem, prop){},
    isSorted: function(){},
    isContainer: function(index){return false},
    isSeparator: function(index){return false},
    getRowProperties: function(index, prop){},
    getCellProperties: function(row, col, prop){},
    getImageSrc: function(row, col){},
    cycleHeader: function(col){}  
  };
}

function onOK() {

}
