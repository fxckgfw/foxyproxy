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

var Ci = Components.interfaces, Cu = Components.utils, Cc = Components.classes;

var EXPORTED_SYMBOLS = ["patternSubscriptions"];

var patternSubscriptions = {
 
  subscriptionsList : [],

  defaultMetaValues :  {
    formatVersion : 1,
    checksum : "",
    algorithm : "",
    url : "",
    format : "FoxyProxy",
    obfuscation : "none",
    name : "",
    notes : "",
    enabled : true,
    refresh : 60,
    nextUpdate : 0,
    timer : null
  },

  subscriptionsTree : null,

  // We count here the amount of load failures during startup in order to
  // show a dialog with the proper amount in overlay.js
  failureOnStartup : 0,

  // We save pattern subscriptions in this array which could only be loaded
  // partially after startup (or refresh) due to errors in the JSON. The idea
  // is to show the user a respective dialog (see onLoad() i options.js)
  // asking here to refresh the corrupted subscription immediately.
  partialLoadFailure : [],

  // TODO: Find a way to load the file efficiently using our XmlHTTPRequest
  // method below...
  loadSavedSubscriptions: function(savedPatternsFile) {
    try {
      var line = {};
      var errorMessages;
      var hasmore;
      var loadedSubscription;
      var metaIdx;
      var parseString;
      if (!savedPatternsFile) {
        // We do not have saved Patterns yet, thus returning...
	return;
      }
      var istream = Cc["@mozilla.org/network/file-input-stream;1"].
                  createInstance(Ci.nsIFileInputStream);
      // -1 has the same effect as 0444.
      istream.init(savedPatternsFile, 0x01, -1, 0);
      var conStream = Cc["@mozilla.org/intl/converter-input-stream;1"].
                createInstance(Ci.nsIConverterInputStream);
      conStream.init(istream, "UTF-8", 0, 0);
      conStream.QueryInterface(Ci.nsIUnicharLineInputStream);
      do {
        // Every subscription should just get its related error messages, 
        // therefore resetting errorMessages here.
	errorMessages = [];
        hasmore = conStream.readLine(line);
        loadedSubscription = this.getObjectFromJSON(line.value, errorMessages); 
	if (loadedSubscription && loadedSubscription.length === undefined) {
          if (loadedSubscription.metadata && 
              loadedSubscription.metadata.refresh != 0) {
            delete loadedSubscription.metadata.timer;
            this.setSubscriptionTimer(loadedSubscription, false, true);
	  }
	  this.subscriptionsList.push(loadedSubscription); 
	} else {
          // Parsing the whole subscription failed but maybe we can parse at
          // least the metadata to show the user the problematic subscription
          // in the subscriptionsTree. Thus, looking for "metadata" first.
          // If we do not find it (because the problem occurred there) then
	  // obviously we are not able to display anything in the tree.
          metaIdx = line.value.indexOf('"metadata"');
          if (metaIdx > -1) {
            // As we cannot be sure that the JSON starts with "{"metadata""
            // (e.g. if the pattern subscription had not had one) we prepend one
            // "{" to our string to parse. We append one as well in order to be
            // sure that our metadata string is valid JSON regardless where 
            // its position in the saved subscription is.
	    parseString = "{" + line.value.slice(metaIdx, line.value.
              indexOf("}", metaIdx) + 1) + "}";
            loadedSubscription = this.getObjectFromJSON(parseString, 
              errorMessages);
	    if (loadedSubscription && loadedSubscription.length === undefined) {
              // At least we could parse the metadata. Now, we can show the
              // subscription in the tree after setting the last status 
              // properly. Afterwards we ask the user if she wants to refresh
              // her subscription immediately in order to solve the issue 
	      // with the corrupt pattern part.
	      errorMessages.push(this.fp.
                getMessage("patternsubscription.error.patterns", 
                [loadedSubscription.metadata.name])); 
	      loadedSubscription.metadata.lastStatus = this.fp.
                getMessage("error"); 
	      loadedSubscription.metadata.errorMessages = errorMessages;
	      this.subscriptionsList.push(loadedSubscription); 
	      this.partialLoadFailure.push(loadedSubscription);
            } else {
	      this.failureOnStartup++;
            }
	  } else {
	    this.failureOnStartup++;
	  } 
	}
      } while(hasmore);
      conStream.close(); 
    } catch (e) {
      dump("Error while loading the saved subscriptions: " + e + "\n");
    }
  },

  loadSubscription: function(aURLString, bBase64) {
    try {
      var errorMessages = [];
      var subscriptionText;
      var parsedSubscription;
      var subscriptionJSON = null;
      var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].
        createInstance(Ci.nsIXMLHttpRequest);
      // We shouuld not use onreadystatechange due to performance issues!
      /*req.onreadystatechange = function (aEvt) {

      };*/

      req.open("GET", aURLString, false);
      // We do need the following line of code. Otherwise we would get an error
      // that our JSON is not well formed if we load it from a local drive. See:
      // http://stackoverflow.com/questions/677902/not-well-formed-error-in-
      // firefox-when-loading-json-file-with-xmlhttprequest 
      req.overrideMimeType("application/json");
      req.send(null);
      subscriptionText = req.responseText;
      // TODO: Implement RegEx-Test for Base64, see:
      // http://www.perlmonks.org/index.pl?node_id=775820 
      // Until we have this test we assume first to have plain text and if this
      // is not working we assume a Base64 encoded response. If the last thing
      // is not working either the subscription parsing and import fails.
      subscriptionJSON = this.getObjectFromJSON(subscriptionText, 
        errorMessages);
      if (subscriptionJSON && !(subscriptionJSON.length === undefined)) {
        dump("The response contained invalid JSON while assuming a plain " +
              "text! We try Base64 decoding first...\n");
        // We need to replace newlines and other special characters here. As 
	// there are lots of implementations that differ on this issue and the
	// issue whether there should/may be a specific line length (say 64 or
	// 76 chars).
	subscriptionText = atob(req.responseText.replace(/\s*/g, ""));
        subscriptionJSON = this.getObjectFromJSON(subscriptionText, 
          errorMessages); 
        // We do not need to process the subscription any further if we got 
        // again no proper subscription object or if the user does not want
        // to import a Base64 encoded subscription (in case she selected "none"
        // as obfuscation).
        if (subscriptionJSON && !(subscriptionJSON.length === undefined)) {
          errorMessages.push(this.fp.
            getMessage("patternsubscription.error.JSON"));
          return errorMessages;
        } else if (!bBase64 && !this.fp.warnings.showWarningIfDesired(null, 
          ["patternsubscription.warning.base64"], "noneEncodingWarning")) { 
          errorMessages.push(this.fp.
            getMessage("patternsubscription.error.cancel64")); 
          return errorMessages; 
        }
        // Now, we reuse the bBase64 flag to indicate whether "Base64" should 
        // show up in the subscriptionsTree. Setting it to true, as we have a 
        // Base64 encoded subscription.
        if (!bBase64) {
          bBase64 = true; 
        }
      } else {
        // The subscription seems to have no Base64 format. Before 
        // proceeding any further let's check whether the user had selected 
        // Base64 as encoding and if so whether she wants to import the pattern
        // subscription though.
	if (bBase64 && !this.fp.warnings.showWarningIfDesired(null, 
            ["patternsubscription.warning.not.base64"], "base64Warning")) {
          errorMessages.push(this.fp.
            getMessage("patternsubscription.error.cancel64")); 
          return errorMessages;  
        }
        // bBase64 reuse...
        if (bBase64) {
          bBase64 = false;
        }
      } 
      parsedSubscription = this.
        parseSubscription(subscriptionJSON, aURLString, errorMessages);
      if (parsedSubscription && parsedSubscription.length === undefined) {
	if (!parsedSubscription.metadata) {
	  parsedSubscription.metadata = {};
        }
        if (bBase64) {
          parsedSubscription.metadata.obfuscation = "Base64";
	} else {
          parsedSubscription.metadata.obfuscation = this.fp.getMessage("none");
        }
        return parsedSubscription;
      } else {
        // Got back error messages and making sure that they are shown in the
	// lastStatus dialog
        return parsedSubscription;
      }
    } catch (e) {
      if (e.name === "NS_ERROR_FILE_NOT_FOUND") {
        this.fp.alert(null, this.fp.
          getMessage("patternsubscription.error.network"));        
        errorMessages.push(this.fp.
          getMessage("patternsubscription.error.network")); 
      } else {
        dump("Error in loadSubscription(): " + e + "\n");
        this.fp.alert(null, this.fp.
        getMessage("patternsubscription.error.network.unspecified")); 
        errorMessages.push(this.fp.
          getMessage("patternsubscription.error.network.unspecified")); 
      }
      return errorMessages;
    }
  },

  getObjectFromJSON: function(aString, errorMessages) {
    var json;
    try {
      // Should never happen...
      if (!aString) {
	errorMessages.push(this.fp.
          getMessage("patternsubscription.error.JSONString"));
	return errorMessages;
      }
      // As FoxyProxy shall be usable with FF < 3.5 we use nsIJSON. But
      // Thunderbird does not support nsIJSON. Thus, we check for the proper
      // method to use here.
      if (typeof Components.interfaces.nsIJSON === "undefined") {
	return JSON.parse(aString);
      } else {
        json = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);
        return json.decode(aString); 
      }
    } catch (e) {
      dump("Error while parsing the JSON: " + e + "\n");
      errorMessages.push(this.fp.
            getMessage("patternsubscription.error.JSON"));
      return errorMessages; 
    }
  },

   getJSONFromObject: function(aObject) {
    var json;
    try {
      // As FoxyProxy shall be usable with FF < 3.5 we use nsIJSON. But
      // Thunderbird does not support nsIJSON. Thus, we check for the proper
      // method to use here.
      if (typeof Components.interfaces.nsIJSON === "undefined") {
	return JSON.stringify(aObject);
      } else {
        json = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);
        return json.encode(aObject); 
      }
    } catch (e) {
      dump("Error while parsing the JSON: " + e + "\n");
    }
  },
 
  parseSubscription: function(aSubscription, aURLString, errorMessages) {
    try {
      var subProperty, ok;
      // Maybe someone cluttered the subscription in other ways...
      for (subProperty in aSubscription) {
        if (subProperty !== "metadata" && subProperty !== "subscription") {
          delete aSubscription[subProperty];
        }	  
      }
      // And maybe someone cluttered the metadata or mistyped a property...
      for (subProperty in aSubscription.metadata) {
        if (!this.defaultMetaValues.hasOwnProperty(subProperty)) {
	  delete aSubscription.metadata[subProperty];
        }
      }
      // Or did that concerning the subscription part.
      for (subProperty in aSubscription.subscription) {
	if (subProperty !== "patterns") {
	  dump("We found: " + subProperty + " here!\n");
	  delete aSubscription.subscription[subProperty];
	}
      }
      // We are quite permissive here. All we need is a checksum. If somebody
      // forgot to add that the subscription is MD5 encoded (using the 
      // algorithm property of the metadata object) we try that though. But we
      // only check the subscription object for several reasons: 1) It is this 
      // object that contains data that we want to have error free. The 
      // metadata is not so important as the user can overwrite a lot of its
      // properties and it contains only additional information 2) We cannot
      // hash the whole a whole subscription as this would include hashing the
      // hash itself, a thing that would not lead to the desired result 
      // without introducing other means of transporting this hash (e.g. using
      // a special HTTP header). But the latter would have drawbacks we want to
      // avoid 3) To cope with 2) we could exclude the checksum property from 
      // getting hashed and hash just all the other parts of the subscription.
      // However, that would require a more sophisticated implementation which
      // currently seems not worth the effort. Thus, sticking to a hashed 
      // subscription object.
      if (aSubscription.metadata && aSubscription.metadata.checksum) {
        ok = this.checksumVerification(aSubscription.metadata.checksum, 
          aSubscription);
        if (!ok) {
          if (!this.fp.warnings.showWarningIfDesired(null, 
            ["patternsubscription.warning.md5"], "md5Warning")) {
	    errorMessages.push(this.fp.
            getMessage("patternsubscription.error.cancel5")); 
            return errorMessages;
          }
        } else {
          // Getting the metadata right...
          if (!aSubscription.metadata.algorithm.toLowerCase() !== "md5") {
            aSubscription.metadata.algorithm = "md5";
          }
        }
      }
      return aSubscription; 
    } catch(e) {
      this.fp.alert(null, this.fp.
        getMessage("patternsubscription.error.parse"));        
        errorMessages.push(this.fp.
          getMessage("patternsubscription.error.parse")); 
      return errorMessages;
    }
  },

  addSubscription: function(aSubscription, userValues) {
    var userValue, d, subLength;
    // We need this do respect the user's wishes concerning the name and other
    // metadata properties. If we would not do this the default values that
    // may be delivered with the subscription itself (i.e. its metadate) would
    // overwrite the users' choices.
    for (userValue in userValues) {
      if (userValue !== "obfuscation") {
        aSubscription.metadata[userValue] = userValues[userValue];
      }
    } 
    // If the name is empty take the URL.
    if (aSubscription.metadata.name === "") {
      aSubscription.metadata.name = aSubscription.metadata.url;
    }
    aSubscription.metadata.lastUpdate = this.fp.logg.format(Date.now()); 
    aSubscription.metadata.lastStatus = this.fp.getMessage("okay");
    aSubscription.metadata.errorMessages = null;
    if (aSubscription.metadata.refresh > 0) { 
      this.setSubscriptionTimer(aSubscription, false, false);
    }
    this.subscriptionsList.push(aSubscription); 
    this.writeSubscriptions();
  }, 

  editSubscription: function(aSubscription, userValues, index) {
    // TODO: What shall we do if the user changed the URL?
    var userValue;
    var oldRefresh = aSubscription.metadata.refresh;
    for (userValue in userValues) {
      aSubscription.metadata[userValue] = userValues[userValue];
    } 
    // If the name is empty take the URL.
    if (aSubscription.metadata.name === "") {
      aSubscription.metadata.name = aSubscription.metadata.url;
    } 
    if (oldRefresh !== aSubscription.metadata.refresh) {
      // We need type coercion here, hence "==" instead of "===".
      if (aSubscription.metadata.refresh == 0) {
        aSubscription.metadata.timer.cancel();
        delete aSubscription.metadata.timer;
        // There is no next update as refresh got set to zero. Therefore, 
        // deleting this property as well.
        delete aSubscription.metadata.nextUpdate;
        // Again, we need type coercion...
      } else if (oldRefresh == 0) {
        this.setSubscriptionTimer(aSubscription, false, false);
      } else {
	// We already had a timer just resetting it to the new refresh value.
        this.setSubscriptionTimer(aSubscription, true, false);
      }
    } 
    this.subscriptionsList[index] = aSubscription;
    this.writeSubscriptions();
  },

  setSubscriptionTimer: function(aSubscription, bRefresh, bStartup) {
    dump("Called setSubscriptionTimer!\n");
    var timer, d, that, event;
    // Now calculating the next time to refresh the subscription and setting
    // a respective timer just in case the user wants to have an automatic
    // update of her subscription.
    if (!aSubscription.metadata.timer) {
      timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      aSubscription.metadata.timer = timer; 
    } else {
      timer = aSubscription.metadata.timer;
    }
    d = new Date().getTime();
    if (bStartup) {
      if (aSubscription.metadata.nextUpdate <= d) {
        this.refreshSubscription(aSubscription, false);
        return;
      }
    } else {
      // TODO: Investigate whether there is an easy way to use 
      // metadata.lastUpdate here in order to calculate the next update time in
      // ms since 1969/01/01. By this we would not need metadata.nextUpdate.
      aSubscription.metadata.nextUpdate = d + aSubscription.metadata.
        refresh * 60 * 1000; 
    }
    that = this;
    var event = {
      notify : function(timer) {
        that.refreshSubscription(aSubscription, false);
        that.subscriptionsTree.view = that.makeSubscriptionsTreeView();
      }
    };
    if (bRefresh) {
      timer.cancel();
      aSubscription.metadata.timer.cancel();
    }
    if (bStartup) {
      // Just a TYPE_ONE_SHOT on startup to come into the regular update cycle.
      timer.initWithCallback(event, aSubscription.metadata.nextUpdate - d, Ci.
        nsITimer.TYPE_ONE_SHOT);
    } else { 
      timer.initWithCallback(event, aSubscription.metadata.refresh * 60 * 1000,
        Ci.nsITimer.TYPE_REPEATING_SLACK);
    }
  },

  getSubscriptionsFile: function() {
    var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    var subDir = this.fp.getSettingsURI(Ci.nsIFile).parent;
    file.initWithPath(subDir.path);
    file.appendRelativePath("patternSubscriptions.json");
    if ((!file.exists() || !file.isFile())) {
      // Owners may do everthing with the file, the group and others are
      // only allowed to read it. 0x1E4 is the same as 0744 but we use it here
      // as octal literals and escape sequences are deprecated and the 
      // respective costants are not available yet, see: bug 433295.
      file.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0x1E4); 
    }
    return file;
  }, 

  writeSubscriptions: function() {
    try {
      var subscriptionsData = "";
      var foStream;
      var converter;
      var subFile = this.getSubscriptionsFile();	
      for (var i = 0; i < this.subscriptionsList.length; i++) {
        subscriptionsData = subscriptionsData + this.getJSONFromObject(this.
	  subscriptionsList[i]) + "\n";
      }
      foStream = Cc["@mozilla.org/network/file-output-stream;1"].
                   createInstance(Ci.nsIFileOutputStream);
      // We should set it to the hex equivalent of 0644
      foStream.init(subFile, 0x02 | 0x08 | 0x20, -1, 0);
      converter = Cc["@mozilla.org/intl/converter-output-stream;1"].
                   createInstance(Ci.nsIConverterOutputStream);
      converter.init(foStream, "UTF-8", 0, 0);
      converter.writeString(subscriptionsData);
      converter.close(); 
    } catch (e) {
      dump("Error while writing the subscriptions to disc: " + e + "\n");
    }
  },

  handleImportExport: function(bImport, bPreparation) {
    var patternElements;
    var f = this.fp.getSettingsURI(Ci.nsIFile);
    var s = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.
      nsIFileInputStream);
    s.init(f, -1, -1, Ci.nsIFileInputStream.CLOSE_ON_EOF);
    var p = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.
      nsIDOMParser);
    var doc = p.parseFromStream(s, null, f.fileSize, "text/xml"); 
    if (bPreparation) {
      // Now we are adding the pattern subscriptions.
      doc.documentElement.appendChild(this.toDOM(doc));
    } 
    if (bImport) {
      // Convert the subscriptions (if there are any) to objects and put them
      // (back) to the susbcriptionsList.
      patternElement = doc.getElementsByTagName("patternSubscriptions").item(0);
      if (patternElement) {
        this.fromDOM(patternElement);
      } else {
	// Although it is not a preparation we set the flag to "true" as we 
	// not not need to execute the respective if-path as there are no
	// pattern susbcriptions to erase.
        bPreparation = true;
      }
    } 
    if (!bPreparation) {
      // As we only want to export these subscriptions and have a separate file
      // to store them locally, we remove them after the file was exported in
      // order to avoid messing unnecessarily with the settings file.
      // The same holds for the import case.
      patternElement = doc.getElementsByTagName("patternSubscriptions").
        item(0);
      doc.documentElement.removeChild(patternElement);
    }
    var foStream = Cc["@mozilla.org/network/file-output-stream;1"].
        createInstance(Ci.nsIFileOutputStream);
    foStream.init(f, 0x02 | 0x08 | 0x20, -1, 0); // write, create, truncate
    // In foxyproxy.js is a call to gFP.toDOM() used instead of doc but that is
    // not available here as the patternSubscriptions are not written there.
    // The result is two missing newlines, one before and one after the DOCTYPE
    // declaration. But that does not matter for parsing the settings. 
    Cc["@mozilla.org/xmlextras/xmlserializer;1"].
      createInstance(Ci.nsIDOMSerializer).serializeToStream(doc, foStream, "UTF-8");
      // foStream.write(str, str.length);
      foStream.close() 
  },

  fromDOM: function(patElem) {
    var subscription, metaNode, subNode, attrib, patternsNode, patterns,
      name, value;
    var subs = patElem.getElementsByTagName("subscription");
    for (var i = 0; i < subs.length; i++) {
      subscription = {};
      metaNode = subs[i].getElementsByTagName("metadata").item(0);
      if (metaNode) {
        subscription.metadata = {};
        attrib = metaNode.attributes;
        for (j = 0; j < attrib.length; j++) {
          name = attrib.item(j).nodeName; 
	  value = attrib.item(j).nodeValue; 
          subscription.metadata[name] = value; 
        }	  
      }	
      subNode = subs[i].getElementsByTagName("patternSub").item(0);
      if (subNode) {
        subscription.subscription = {};
        patternsNode = subNode.getElementsByTagName("patterns").item(0);
        if (patternsNode) {
	  subscription.subscription.patterns = [];
	  patterns = patternsNode.getElementsByTagName("pattern");
	  for (var k = 0; k < patterns.length; k++) {
            subscription.subscription.patterns[k] = {};
	    attrib = patterns[k].attributes;
	    for (var l = 0; l < attrib.length; l++) {
	      name = attrib.item(l).nodeName; 
	      value = attrib.item(l).nodeValue; 
              subscription.subscription.patterns[k][name] = value; 
            }
          }
        }
      }
      this.subscriptionsList.push(subscription);
    }
    // Add now save the pattern subscriptions to disk...
    this.writeSubscriptions();
  },

  toDOM: function(doc) {
    var sub, meta, sub2, pat, pat2, patterns;
    var e = doc.createElement("patternSubscriptions");
    for (var i = 0; i < this.subscriptionsList.length; i++) {
      patterns = this.subscriptionsList[i].subscription.patterns;
      sub = doc.createElement("subscription");
      meta = doc.createElement("metadata");
      sub2 = doc.createElement("patternSub");
      pat = doc.createElement("patterns");
      for (a in this.subscriptionsList[i].metadata) {
	meta.setAttribute(a, this.subscriptionsList[i].metadata[a])
      }
      sub.appendChild(meta);
      for (j = 0; j < patterns.length; j++) {
	pat2 = doc.createElement("pattern");
        for (a in patterns[j]) {
          pat2.setAttribute(a, patterns[j][a]);  
	}
	pat.appendChild(pat2);
      }
      sub2.appendChild(pat);
      sub.appendChild(sub2);
      e.appendChild(sub);
    }
    return e;
  },

  refreshSubscription: function(aSubscription, showResponse) {
    // We are calculating the index in this method in order to be able to
    // use it with the nsITimer instances as well. If we would get the 
    // index from our caller it could happen that the index is wrong due
    // to changes in the subscription list while the timer was "sleeping".
    var aIndex, proxyList = [];
    for (var i = 0; i < this.subscriptionsList.length; i++) {
      if (this.subscriptionsList[i] === aSubscription) {
	aIndex = i;
      }
    }
    // Estimating whether the user wants to have the subscription base64 
    // encoded. We use this as a parameter to show the proper dialog if there
    // is a mismatch between the users choice and the subscription's
    // encoding.
    var base64Encoded = aSubscription.metadata.obfuscation.toLowerCase() ===
      "base64";
    var refreshedSubscription = this.loadSubscription(aSubscription.
      metadata.url, base64Encoded); 
    // Our "array test" we deployed in addeditsubscription.js as well.
    if (refreshedSubscription && !(refreshedSubscription.length === 
          undefined)) {
      this.fp.alert(null, this.fp.
        getMessage("patternsubscription.update.failure")); 
      aSubscription.metadata.lastStatus = this.fp.getMessage("error"); 
      // So, we really did not get a proper subscription but error messages.
      // Making sure that they are shown in the lastStatus dialog.
      aSubscription.metadata.errorMessages = refreshedSubscription;
    } else {
      // We do not want to loose our metadata here as the user just 
      // refreshed the subscription to get up-to-date patterns.
      aSubscription.subscription = refreshedSubscription.
        subscription;
      // Maybe the obfuscation changed. We should update this...
      aSubscription.metadata.obfuscation = refreshedSubscription.
        metadata.obfuscation;	
      aSubscription.metadata.lastStatus = this.fp.getMessage("okay");
      // We did not get any errors. Therefore, resetting the errorMessages
      // array to null.
      aSubscription.metadata.errorMessages = null;
      // If we have a timer-based update of subscriptions we deactive the
      // success popup as it can be quite annoying to get such kinds of popups
      // while surfing. TODO: Think about doing the same for failed updates.
      if (showResponse) {
        this.fp.alert(null, this.fp.
          getMessage("patternsubscription.update.success")); 
      }
    }
    aSubscription.metadata.lastUpdate = this.fp.logg.format(Date.now()); 
    // Refreshing a subscription means refreshing the timer as well if there
    // is any...
    if (aSubscription.metadata.refresh > 0) {
      this.setSubscriptionTimer(aSubscription, true, false);
    }
    // And it means above all refreshing the patterns... But first we generate 
    // the proxy list.
    if (aSubscription.metadata.proxies.length > 0) {
      proxyList = this.getProxiesFromId(aSubscription.metadata.proxies);
      // First, deleting the old subscription patterns.
      this.deletePatterns(proxyList, aSubscription.metadata.enabled);
      // Now, we add the refreshed ones...
      this.addPatterns(aIndex, proxyList); 
    } 
    this.subscriptionsList[aIndex] = aSubscription;	
    this.writeSubscriptions(); 
  },

  addPatterns: function(currentSubIndex, proxyList) {
    // Now are we going to implement the crucial part of the pattern
    // subscription feature: Adding the patterns to the proxies.
    // We probably need no valiatePattern()-call as in pattern.js as the user
    // is not entering a custom pattern itself but imports a list assuming
    // the latter is less error prone.
    var currentSub;
    var currentMet;
    var currentPat;
    var pattern;
    var i,j; 
    if (currentSubIndex) {
      currentSub = this.subscriptionsList[currentSubIndex];
    } else {
      currentSub = this.subscriptionsList[this.subscriptionsList.length - 1];
    }
    currentMet = currentSub.metadata;
    currentPat = currentSub.subscription;
    for (i = 0; i < proxyList.length; i++) {
      // TODO: Maybe we could find a way to blend an old subscription or
      // old patterns with a new one!?
      if (currentPat && currentPat.patterns) {
        for (j = 0; j < currentPat.patterns.length; j++) {
          pattern = Cc["@leahscape.org/foxyproxy/match;1"].createInstance().
                    wrappedJSObject; 
          pattern.init(currentSub.metadata.enabled, currentPat.patterns[j].name, 
                      currentPat.patterns[j].pattern, false, currentPat.
                      patterns[j].type.toLowerCase() === "wildcard" ? false : 
                      true, currentPat.patterns[j].caseSensitive ? true : false,
                      currentPat.patterns[j].whitelist ? true : false, false,
		      true);
          proxyList[i].matches.push(pattern);
        }
      }
    } 
  },

  deletePatterns: function(aProxyList) {
    var i,j,k,matchesLength; 
    for (i = 0; i < aProxyList.length; i++) {
      matchesLength = aProxyList[i].matches.length; 
      j = k = 0;
      do {
        if (aProxyList[i].matches[j].fromSubscription) {
            aProxyList[i].matches.splice(j, 1);
        } else {
          j++;	
        }
          k++;
      } while (k < matchesLength);  
    } 
    this.fp.writeSettings(); 
  },

  changeSubStatus: function(aProxyList, bNewStatus) {
    for (var i = 0; i < aProxyList.length; i++) {
      for (var j = 0; j < aProxyList[i].matches.length; j++) {
        // We know already that the status has changed. Thus, we only need to
        // apply the new one to the subscription patterns.
        if (aProxyList[i].matches[j].fromSubscription) {
	  aProxyList[i].matches[j].enabled = bNewStatus;
        }
      }
    }
  },

  checksumVerification: function(aChecksum, aSubscription) {
    var result, data, ch, hash, finalHash, i;
    // First getting the subscription object in a proper stringified form.
    // That means just to stringify the Object. JSON allows (additional) 
    // whitespace (see: http://www.ietf.org/rfc/rfc4627.txt section 2) 
    // but we got rid of it while creating the JSON object the first time.
    var subscriptionJSON = this.getJSONFromObject(aSubscription.subscription);
    
    // Following https://developer.mozilla.org/En/NsICryptoHash 
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
                    createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var result = {};
    data  = converter.convertToByteArray(subscriptionJSON, result);
    ch = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);
    // We just have the checksum here (maybe the user forgot to specify MD5) in
    // the metadata. But we can safely assume MD5 as we are currently
    // supporting just this hash algorithm.
    ch.init(ch.MD5);
    ch.update(data, data.length); 
    hash = ch.finish(false);
    finalHash = [this.toHexString(hash.charCodeAt(i)) for (i in hash)].
      join("");
    if (finalHash === aChecksum) {
      return true;
    }
    return false;
  },

  toHexString: function(charCode) {
    return ("0" + charCode.toString(16)).slice(-2);
  },

  getProxiesFromId: function(aIdArray) {
    var proxyArray = [];
    for (var i = 0; i < aIdArray.length; i++) {
      for (var j = 0; j < this.fp.proxies.length; j++) { 
        if (aIdArray[i] === this.fp.proxies.item(j).id) { 
	  proxyArray.push(this.fp.proxies.item(j));
        }
      }
    }
    return proxyArray;
  },

  makeSubscriptionsTreeView: function() {
    var that = this;
    var ret = {
      rowCount : that.subscriptionsList.length,
      getCellText : function(row, column) {
        var i = that.subscriptionsList[row];
        switch(column.id) {
          case "subscriptionsEnabled" : return i.metadata.enabled;
	  case "subscriptionsName" : return i.metadata.name;
          case "subscriptionsNotes" : return i.metadata.notes;
          case "subscriptionsUri" : return i.metadata.url;           
	  // We are doing here a similar thing as in addeditsubscription.js
	  // in the onLoad() function described: As we only saved the id's
	  // and the id's are not really helpful for users, we just use them to 
	  // get the respective name of a proxy out of the proxies object
	  // belonging to the foxyproxy service. These names are then displayed
	  // in the subscriptions tree comma separated in the proxy column.
          case "subscriptionsProxy":
	    var proxyString = "";
	    for (var j = 0; j < i.metadata.proxies.length; j++) {
	      for (var k = 0; k < that.fp.proxies.length; k++) {
		if (i.metadata.proxies[j] === that.fp.proxies.item(k).id) {
                  proxyString = proxyString + that.fp.proxies.item(k).name;
	          if (j < i.metadata.proxies.length - 1) {
		    proxyString = proxyString + ", ";
                  }
		}
              }
	    }
	    return proxyString; 
          case "subscriptionsRefresh" : return i.metadata.refresh;
          case "subscriptionsStatus" : return i.metadata.lastStatus;
          case "subscriptionsLastUpdate" : return i.metadata.lastUpdate;   
          case "subscriptionsFormat" : return i.metadata.format;
          case "subscriptionsObfuscation" : return i.metadata.obfuscation;
        }
      },
      setCellValue: function(row, col, val) {
		      that.subscriptionsList[row].metadata.enabled = val;
		    },
      getCellValue: function(row, col) {
		      return that.subscriptionsList[row].metadata.enabled;
		    },    
      isSeparator: function(aIndex) { return false; },
      isSorted: function() { return false; },
      isEditable: function(row, col) { return false; },
      isContainer: function(aIndex) { return false; },
      setTree: function(aTree){},
      getImageSrc: function(aRow, aColumn) {return null;},
      getProgressMode: function(aRow, aColumn) {},
      cycleHeader: function(aColId, aElt) {},
      getRowProperties: function(aRow, aColumn, aProperty) {},
      getColumnProperties: function(aColumn, aColumnElement, aProperty) {},
      getCellProperties: function(row, col, props) {},
      getLevel: function(row){ return 0; } 
    };
    return ret;
  }
}
