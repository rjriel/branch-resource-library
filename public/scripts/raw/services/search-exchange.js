var SearchExchange = (function(){

  function SearchExchange(){
    var that = this;
    this.seqId = 0;

    this.objects = {};
    this.online = false;

    this.clearing = false;

    this.priority = [];
    this.queue = [];

    this.pendingSearch;
    this.pendingSuggest;

    this.state;

    this.view;

    this.catalog = {};

    $.ajax({type: "GET", dataType: "text", contentType: "application/json", url: '/configs/sense.json', success: function(json){

      var config = JSON.parse(json);

      qsocks.Connect(config).then(function(global){
        global.openDoc(config.appname).then(function(app){
          senseApp = app;
          var old = senseApp.connection.ws.onmessage
          senseApp.connection.ws.onmessage = function(ev){
            var msg = JSON.parse(ev.data);
            if( msg.suspend ) {
              that.publish('resume');
            } else if(old != null) {
              old(ev);
            }
          };
          that.seqId = senseApp.connection.seqid;
          //$rootScope.$broadcast("senseready", app);
          that.online = true;
          //this sets up a constant ping to ensure the websocket stays connected
          function ping(){
            that.ask(-1, "ProductVersion", [],function(result){});
            setTimeout(function(){
              ping();
            },30000);
          }
          ping();
          that.publish('online');
        }, function(error) {
            if (error.code == "1002") { //app already opened on server
                global.getActiveDoc().then(function(app){
                  senseApp = app;
                  //$rootScope.$broadcast("senseready", app);
                });
            } else {
                console.log(error)
                $rootScope.$broadcast("senseoffline");
            }
        });
      });

    }});

      this.subscribe = function(eventName, id, callbackFn){
        if(!that.catalog[eventName]){
          that.catalog[eventName] = {};
        }
        if(that.catalog[eventName][id]){
          delete that.catalog[eventName][id];
        }
        that.catalog[eventName][id] = {fn: callbackFn};
      };

      this.unsubscribe = function(eventName, id){
        delete that.catalog[eventName][id];
      };

      this.publish = function(eventName, handles, data){
        if(that.catalog[eventName]){
          if(that.view && eventName!="online"){
            for(var sub in that.catalog[eventName]){
              if(sub.split(".")[0].indexOf(that.view)!=-1){
                that.catalog[eventName][sub].fn.call(null, handles, data);
              }
            }
          }
          else{
            var ind = 0;
            for(var sub in that.catalog[eventName]){
              that.catalog[eventName][sub].fn.call(null, handles, data);
              ind++;
            }
          }
        }
      };

      this.subscribe('online', 'clear', function(){
        that.clear(true);
      });

      this.setStateAttr = function(name, prop){
        if(!that.state){
          that.state = {};
        }
        that.state[name] = prop;
      };

      this.matched;

      var senseApp;

      this.init = function(defaultSelections){
        if(defaultSelections && defaultSelections.length > 0){
          defaultSelections.forEach(function(selection, index){
            that.makeSelection(selection, function(result) {
              if(index==defaultSelections.length-1){
                that.lockSelections(function(result){
                  that.executePriority();
                })
              }
            }, true);
          });
        }
        else{
          that.executePriority();
        }
      };

      this.executeQueue = function(){
        if(that.queue.length > 0){
          for (var i=0;i<that.queue.length;i++){
            that.queue[i].call();
            if(i==that.queue.length-1){
              that.queue = [];
              if(that.online){
                that.publish("update");
              }
              else{
                that.subscribe('online', 'queue', function(){
                  that.publish("update")
                });
              }
            }
          }
        }
        else {
          if(that.online){
            that.publish("update");
          }
          else{
            that.subscribe('online', 'queue', function(){
              that.publish("update")
            });
          }
          //$rootScope.$broadcast("update");
        }
      };

      this.executePriority = function(){
        if(that.priority && that.priority.length > 0){
          that.priority.forEach(function(priorityFn, index){
            priorityFn.call(null);
            if(index = that.priority.length-1){
              that.priority = [];
              that.executeQueue();
            }
          })
        }
        else{
          that.executeQueue();
        }
      };

      this.clear = function(unlock){
        this.clearing = true;
        var handles;
        that.state = null;
        if(senseApp){
          if(unlock && unlock==true){
            that.ask(senseApp.handle, "UnlockAll", [], function(result){
              that.ask(senseApp.handle, "ClearAll", [],function(result){
                this.clearing = false;
                that.publish('reset');
              });
            });
          }
          else{
            that.ask(senseApp.handle, "ClearAll", [],function(result){
              this.clearing = false;
              that.publish('cleared');
            });
          }
        }
        else{
        }
      };

      this.render = function(){
        that.publish('update');
      }
      this.fresh = function(){
          this.search("");
      }
      this.setPage = function(page){
        if(!this.state){
          this.state = {};
        }
        this.state.page = page-1;
        this.publish('update');
      }

      this.search = function(searchText, searchFields){
        that.setStateAttr("searchText", searchText);
        that.setStateAttr("searchFields", searchFields);

        that.publish("searching");
        that.terms = searchText.split(" ");

        that.seqId++;
        that.pendingSearch = that.seqId;
        senseApp.connection.ask(senseApp.handle, "SearchAssociations", [{qContext: "LockedFieldsOnly", qSearchFields: searchFields}, that.terms, {qOffset: 0, qCount: 5, qMaxNbrFieldMatches: 5}], that.seqId).then(function(response){
          if(response.id == that.pendingSearch){
            if(searchText=="" || response.result.qResults.qTotalSearchResults>0){
              that.ask(senseApp.handle, "SelectAssociations", [{qContext: "LockedFieldsOnly", qSearchFields:searchFields}, that.terms, 0], function(response){
                that.publish('update', response.change);
              });
            }
            else{
              that.publish('noresults', response.change);
            }
          }
        });
      };

      this.suggest = function(searchText, suggestFields){
        that.seqId++;
        that.pendingSuggest = that.seqId;
        senseApp.connection.ask(senseApp.handle, "SearchSuggest", [{qContext: "LockedFieldsOnly", qSearchFields: suggestFields}, searchText.split(" ")], that.seqId).then(function(response){
          if(response.id == that.pendingSuggest){
            that.publish('suggestResults', null, response.result.qResult);
          }
        });
      };

      this.addFilter = function(options, callbackFn, priority){
        var fn;
        if(that.objects[options.id]){
          fn = function(){
            callbackFn.call(null, {handle:that.objects[options.id]});
          }
        }
        else{
          fn = function(){
            var lbDef = {
              qInfo:{
                qType: "ListObject"
              },
              qListObjectDef:{
                qStateName: "$",
                qDef:{
                  qFieldDefs:[options.field]
                },
                qAutoSortByState: {
                  qDisplayNumberOfRows: 8
                }
              }
            };
            that.seqId++;
            senseApp.connection.ask(senseApp.handle, "CreateSessionObject", [lbDef], that.seqId).then(function(response){
              that.objects[options.id] = response.result.qReturn.qHandle;
              callbackFn.call(null, {handle: response.result.qReturn.qHandle});
            });
          };
        }
        if(that.online){
          fn.call();
        }
        else{
          that.subscribe('online', options.field, fn);
        }
      };

      this.makeSelection = function(options, callbackFn, priority){
        if(f = that.objects[options.field]){
          fn = function(){
            that.ask(f, "SelectValues", [options.values], function(response){
              callbackFn.call(null, response);
            });
          }
        }
        else{
          fn = function(){
            that.ask(senseApp.handle, "GetField" ,[options.field], function(response){
              that.objects[options.field] = response.result.qReturn.qHandle;
              that.ask(response.result.qReturn.qHandle, "SelectValues", [options.values], function(response){
                callbackFn.call(null, response);
              });
            });
          };
        }
        if(that.online){
          fn.call();
        }
        else{
          that.subscribe('online', options.field, fn);
        }
      };

      that.lockSelections = function(callbackFn){
        fn = function(){
          that.ask(senseApp.handle, "LockAll", [], function(result){
            callbackFn.call(null);
          });
        }
        if(that.online){
          fn.call();
        }
        else{
          that.subscribe('online', 'lock', fn);
        }
      }

      this.addResults = function(options, callbackFn, priority){
        if(that.objects[options.id]){
          fn = function(){
            callbackFn.call(null, {handle:that.objects[options.id]});
          };
        }
        else{
          fn = function(){
            var hDef = {
              "qInfo" : {
                  "qType" : "table"
              },
              "qHyperCubeDef": {
                "qDimensions" : buildFieldDefs(options.fields, options.sortOptions),
                "qMeasures": buildMeasureDefs(options.fields),
              	"qSuppressZero": false,
              	"qSuppressMissing": false,
              	"qInterColumnSortOrder": options.defaultSort
              }
            }
            that.seqId++;
            senseApp.connection.ask(senseApp.handle, "CreateSessionObject", [hDef], that.seqId).then(function(response){
              that.objects[options.id] = response.result.qReturn.qHandle;
              callbackFn.call(null, {handle:response.result.qReturn.qHandle});
            });
          };
        }
        if(that.online){
          fn.call();
        }
        else{
          that.subscribe('online', options.id, fn);
        }
      };

      this.ask = function(handle, method, args, callbackFn){
        that.seqId++;
        senseApp.connection.ask(handle, method, args, that.seqId).then(function(response){
          callbackFn.call(null, response);
        });
      }

      function buildFieldDefs(fields, sorting){
        var defs = [];
        for (var i=0;i<fields.length;i++){
          if(fields[i].dimension){
            var def = {
        			"qDef": {
        				"qFieldDefs": [fields[i].dimension]
              },
              qNullSuppression: fields[i].suppressNull
        		}
            if(sorting[fields[i].dimension]){
              var sort = {};
              sort[sorting[fields[i].dimension].sortType] = sorting[fields[i].dimension].order;
              def["qDef"]["qSortCriterias"] = [sort];
            }
            defs.push(def);
          }
        }
        return defs;
      }

      function buildMeasureDefs(fields){
        var defs = [];
        for (var i=0;i<fields.length;i++){
          if(fields[i].measure){
            var def = {
              "qDef": {
      					"qLabel": fields[i].label,
      					"qDescription": "",
      					"qDef": fields[i].measure
      				}
            }
            if(fields[i].sortType){
              def["qSortBy"] = {};
              def["qSortBy"][fields[i].sortType] = fields[i].order;
            }
            defs.push(def);
          }
        };
        return defs;
      }
  }

  return SearchExchange;

}());

var searchExchange = new SearchExchange();
