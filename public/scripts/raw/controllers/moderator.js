app.controller("moderatorController", ["$scope", "$resource", "$state", "$stateParams", "userManager", "resultHandler", "confirm", function($scope, $resource, $state, $stateParams, userManager, resultHandler, confirm){
  var Flags = $resource("api/flag/:flagId", {flagId: "@flagId"});

  //check to see that a user is logged in and that they have the correct permissions
  var entities = [
    "project",
    "comment",
    "user"
  ]

  $scope.isModerator = false;

  $scope.activeTab = 0;

  $scope.showComments = false;

  $scope.commentsType;
  $scope.commentsTitle;
  $scope.comments = [];

  $scope.commentsTemplate;

  if(!$scope.commentsTemplate){
    $.get("/views/moderator/moderator-comments.html").success(function(html){
      $scope.commentsTemplate = new Templater(html);
    });
  }

  var defaultSelection;

  $scope.setTab = function(index){
    $scope.activeTab = index;
    searchExchange.clear();
  };

  searchExchange.subscribe('clearFlags', "moderatorController", function(flagType, id){
    Flags.save({entityId: id, flagType: flagType}, {flagged: false}, function(result){
      if(resultHandler.process(result)){

      }
    });
  });

  searchExchange.subscribe('viewComments', "moderatorController", function(handles, id){
    $scope.commentsTitle = handles[1];
    var flagType = handles[0];
    $scope.commentType = handles[0]=='flag' ? 'Flag' : 'Spam';
    Flags.get({entityId: id, flagType: flagType, flagged: true}, function(results){
      if(resultHandler.process(results)){
        document.getElementById("moderator_comments").innerHTML = $scope.commentsTemplate.getHTML({commentType: $scope.commentType, commentsTitle: $scope.commentsTitle, comments: results.data});
        document.getElementById("moderator_comments_container").style.display = "block";
      }
    });
  });

  searchExchange.subscribe('closeComments', "moderatorController", function(){
    document.getElementById("moderator_comments").innerHTML = "";
    document.getElementById("moderator_comments_container").style.display = "none";
  });

  $scope.$on("$stateChangeSuccess", function(event, toState, toParams, fromState, fromParams){
    if(fromState.name.split(".")[0]==toState.name.split(".")[0]){ //then we should clear the search state
       if(toState.name.split(".").length==1){ //we only need to do this if we're on a listing page
        searchExchange.publish("executeSearch");
       }
    }
    if(toState.name!="loginsignup"){
      searchExchange.view = toState.name.split(".")[0];
    }
    if((fromState.name.split(".")[0]!=toState.name.split(".")[0]) || fromState.name=="loginsignup"){
      searchExchange.clear(true);
    }
    defaultSelection = [];
    if(!userManager.hasUser()){
      userManager.refresh(function(hasUser){
        if(!hasUser){
          window.location = "#!login?url=moderator";
        }
        else{
          var ents = [];
          for(var i=0;i<entities.length;i++){
            if(userManager.canApprove(entities[i])){
              $scope.isModerator = true;
              ents.push({qText: entities[i]});
            }
          }
          defaultSelection = [{
            field: "DocType",
            values: ents
          }];
        }
        console.log($scope.isModerator);
        if(!$scope.isModerator){
            window.location = "/";
        }
        //this effectively initiates the results
        searchExchange.subscribe('reset', "moderator", function(){
          searchExchange.init(defaultSelection);
          searchExchange.unsubscribe('reset', "moderator");
        });
        if((fromState.name.split(".")[0]!=toState.name.split(".")[0]) || fromState.name=="loginsignup"){
          searchExchange.clear(true);
        }
      });
    }
    else{
      var ents = [];
      for(var i=0;i<entities.length;i++){
        if(userManager.canApprove(entities[i])){
          $scope.isModerator = true;
          ents.push({qText: entities[i]});
        }
      }
      defaultSelection = [{
        field: "DocType",
        values: ents
      }];
      if(!$scope.isModerator){
          window.location = "/";
      }
      searchExchange.subscribe('reset', "moderator", function(){
        searchExchange.init(defaultSelection);
        searchExchange.unsubscribe('reset', "moderator");
      });
      if((fromState.name.split(".")[0]!=toState.name.split(".")[0]) || fromState.name=="loginsignup"){
        searchExchange.clear(true);
      }
    }
  });

  $scope.setTab(0);

}]);
