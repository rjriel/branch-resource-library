(function() {
  var app = angular.module("branch", ["ui.router", "ngResource", "ngNotificationsBar", "ngPaging", "ngSanitize" ]);

  app.config(["$stateProvider","$urlRouterProvider", "notificationsConfigProvider", "pagingConfigProvider", function($stateProvider, $urlRouterProvider, notificationsConfigProvider, pagingConfigProvider) {
    $urlRouterProvider.otherwise("/");

    notificationsConfigProvider.setAutoHide(true);

    notificationsConfigProvider.setHideDelay(1500);

    $stateProvider
    //home page
    .state("home", {
      url: "/",
      templateUrl: "/views/home/index.html",
      controller: "homeController"
    })
    //login and signup page
    .state("loginsignup", {
      url: "/loginsignup",
      templateUrl : "/views/loginsignup.html"
    })
    //login page
    //used if a session has expired or user is not logged in and tries to navigate to a page that requires authentication
    .state("login", {
      url: "/login",
      templateUrl : "/views/login.html"
    })
    //used to navigate to the admin console
    .state("admin", {
      url: "/admin",
      templateUrl: "/views/admin/index.html",
      controller: "adminController"
    })
    //used to navigate to the project list page
    .state("projects", {
      url: "/projects?page&sort",
      templateUrl: "/views/projects/index.html",
      controller: "projectController"
    })
    //used to navigate to a given project detail page
    .state("projects.detail", {
      url: "/:projectId",
      views: {
          "@":{
            templateUrl: "/views/projects/detail.html",
            controller: "projectController"
          }
        }
    })
  }]);

  //directives
  //this is a directive/module specific to Branch and it's server paging mechanism
  (function (root, factory) {
  	if (typeof exports === 'object') {
  		module.exports = factory(root, require('angular'));
  	} else if (typeof define === 'function' && define.amd) {
  		define(['angular'], function (angular) {
  			return (root.ngPaging = factory(root, angular));
  		});
  	} else {
  		root.ngPaging = factory(root, root.angular);
  	}
  }(this, function (window, angular) {
  	var module = angular.module('ngPaging', []);
    module.provider('pagingConfig', function() {
      return {
  			$get: function(){
  				return {}
  			}
  		};
    });

    module.factory('paging', ['$rootScope', function ($rootScope) {
  		return {};
    }]);


    module.directive('pagingControl', ['pagingConfig', '$timeout', function (pagingConfig, $timeout) {
      return {
  			restrict: "E",
  			scope:{
  				info: "=",
  				sortoptions: "=",
  				sort: "="
  			},
        template: function(elem, attr){
          html = '<div class="project-result-header">\
  	        Showing {{info.pages[info.currentPage-1].pageStart + 1 || 1}} - {{info.pages[info.currentPage-1].pageEnd}} of {{info.total}} results\
  	        <div class="paging">\
  	          <label>Page {{info.currentPage}} of {{info.pages.length}}</label>\
  	          <ul class="page-list plainlist">\
  	            <li ng-hide="info.currentPage==1">\
  	              <a href="#projects?page=1&sort={{sort.field}}" class="icon first"></a>\
  	            </li>\
  	            <li ng-hide="info.currentPage==1">\
  	              <a href="#projects?page={{info.currentPage-1}}&sort={{sort.field}}" class="icon prev"></a>\
  	            </li>\
  	            <li ng-repeat="page in info.pages" ng-show="pageInRange(page.pageNum)" ng-clsick="getProjectData(page.pageStart)" ng-class="{active: page.pageNum==info.currentPage}">\
  	              <a href="#projects?page={{page.pageNum}}&sort={{sort.field}}">{{page.pageNum}}</a>\
  	            </li>\
  	            <li ng-show="info.currentPage < info.pages.length" ng-click="getProjectData(info.pages[info.currentPage].pageStart)">\
  	              <a href="#projects?page={{info.currentPage+1}}&sort={{sort.field}}" class="icon next"></a>\
  	            </li>\
  	            <li ng-show="info.currentPage < info.pages.length" ng-click="getProjectData(info.pages[info.pages.length-1].pageStart)">\
  	              <a href="#projects?page={{info.pages.length}}&sort={{sort.field}}" class="icon last"></a>\
  	            </li>\
  	          </ul>\
  	        </div>';
  					if(attr.enablesorting){
  							html += '<div class="sorting">\
  			          <label>Sort by: </label><select class="form-control" ng-change="applySort()" ng-model="sort" ng-options="item.name for item in sortoptions track by item.field"/>\
  			        </div>'
  					}
  	        html += '</div>';
  					return html;
        },
        link: function(scope){
  				scope.pageInRange = function(pageIndex){
  					var minPage, maxPage;
  					if(scope.info.currentPage <= 2){
  						minPage = 1;
  						maxPage = 5
  					}
  					else if (scope.info.currentPage >= scope.info.pages.length - 2) {
  						minPage = scope.info.pages.length - 5;
  						maxPage = scope.info.pages.length;
  					}
  					else{
  						minPage = scope.info.currentPage - 2;
  						maxPage = scope.info.currentPage + 2;
  					}
  					return (pageIndex >= minPage && pageIndex <= maxPage);
  				};
  				scope.applySort = function(){
  			    window.location = "#projects?page="+scope.info.currentPage+"&sort="+ scope.sort.field;
  			  };
        }
      }
    }]);

  	return module;
  }));

  //services
  app.service('userPermissions', ['$resource', function($resource){
    var System = $resource("system/:path", {path: "@path"});
    this.permissions = {};
    var that = this;
    this.canCreate = function(entity){
      return this.permissions[entity] && this.permissions[entity].create && this.permissions[entity].create==true
    }
    this.canRead = function(entity){
      console.log(entity);
      return this.permissions[entity] && this.permissions[entity].read && this.permissions[entity].read==true
    }
    this.canUpdate = function(entity){
      return this.permissions[entity] && this.permissions[entity].update && this.permissions[entity].update==true
    }
    this.canDelete = function(entity){
      return
      (this.permissions[entity] && this.permissions[entity].softDelete && this.permissions[entity].softDelete==true)
      ||
      (this.permissions[entity] && this.permissions[entity].hardDelete && this.permissions[entity].hardDelete==true)
    }
    this.canSeeAll = function(entity){
      return this.permissions[entity] && this.permissions[entity].allOwners && this.permissions[entity].allOwners==true
    }
    this.canApprove = function(entity){
      return this.permissions[entity] && this.permissions[entity].approve && this.permissions[entity].approve==true
    }
    this.refresh = function(){
      System.get({path:'userpermissions'}, function(result){
        that.permissions = result;
      });
    }
    this.refresh();
  }]);

  app.service('resultHandler', ["notifications", function(notifications){
    this.process = function(result, action){   //deals with the result in a generic way. Return true if the result is a success otherwise returns false
      if(result.redirect){
        window.location = result.redirect;
        return false;
      }
      else if (result.errCode) {
        notifications.showError({
          message: result.errText,
          hideDelay: 3000,
          hide: true
        });
        return false;
      }
      else {
        //if an action has been passed notify the user of it's success
        if(action){
          notifications.showSuccess({message: action + " Successful"});
        }
        return true;
      }
    }
  }]);

  //controllers
  app.controller("adminController", ["$scope", "$resource", "$state", "$stateParams", "userPermissions", "resultHandler", function($scope, $resource, $state, $stateParams, userPermissions, resultHandler){
    var User = $resource("api/users/:userId", {userId: "@userId"});
    var Project = $resource("api/projects/:projectId", {projectId: "@projectId"});
    var Article = $resource("api/articles/:articleId", {articleId: "@articleId"});
    var UserRoles = $resource("api/userroles/:roleId", {roleId: "@roleId"});
    var Feature = $resource("api/features/:featureId", {featureId: "@featureId"});

    $scope.permissions = userPermissions;

    $scope.collections = [
      "users",
      "userroles",
      "features",
      "projects"
    ];

    User.get({}, function(result){
      if(resultHandler.process(result)){
        $scope.users = result.data;
        $scope.userInfo = result;
        delete $scope.userInfo["data"];
      }
    });

    UserRoles.get({}, function(result){
      if(resultHandler.process(result)){
        $scope.roles = result.data;
        $scope.roleInfo = result;
        delete $scope.roleInfo["data"];
        $scope.setRole(0);
      }
    });

    Feature.get({}, function(result){
      if(resultHandler.process(result)){
        $scope.features = result.data;
        $scope.featureInfo = result;
        delete $scope.featureInfo["data"];
        $scope.setFeature(0);
      }
    });

    $scope.activeRole = 0;

    $scope.activeTab = 0;

    $scope.activeFeature = 0;

    $scope.setTab = function(index){
      $scope.activeTab = index;

      if(index==2){
        //if the feature entities haven't been loaded get the first page of data
        //PROJECTS
        if(!$scope.projects || $scope.projects.length==0){
          Project.get({}, function(result){
            if(resultHandler.process(result)){
              $scope.projects = result.data;
              $scope.projectInfo = result;
              delete $scope.projectInfo["data"];
            }
          })
        }
        //ARTICLES
        if(!$scope.articles || $scope.articles.length==0){
          Article.get({}, function(result){
            if(resultHandler.process(result)){
              $scope.articles = result.data;
              $scope.articleInfo = result;
              delete $scope.articleInfo["data"];
            }
          })
        }
      }
    };

    $scope.setRole = function(index){
      $scope.activeRole = index;
      $scope.copyRoleName = $scope.roles[$scope.activeRole].name;
    };

    $scope.setActiveFeature = function(index){
      $scope.activeFeature = index;
    };

    $scope.saveRole = function(){
      console.log($scope.roles[$scope.activeRole]);
      UserRoles.save({roleId:$scope.roles[$scope.activeRole]._id}, $scope.roles[$scope.activeRole], function(result){
        if(resultHandler.process(result, "Save")){
          $scope.permissions.refresh();
        }
      });
    };

    $scope.newRole = function(newrolename){
      var that = this;
      UserRoles.save({}, {name: newrolename}, function(result){
        if(resultHandler.process(result, "Create")){
          $scope.roles.push(result);
          that.newrolename = "";
          $scope.setRole($scope.roles.length -1);
        }
      });
    };

    $scope.copyRole = function(copyrolename){
      var roleToCopy = $scope.roles[$scope.activeRole];
      if(copyrolename==roleToCopy.name){
        copyrolename += " - copy";
      }
      UserRoles.save({}, {name: copyrolename, permissions: roleToCopy.permissions}, function(result){
        if(resultHandler.process(result, "Copy")){
          $scope.roles.push(result);
          $scope.setRole($scope.roles.length -1);
        }
      });
    };

    $scope.setFeature = function(id){
      if($scope.features[$scope.activeFeature].name=="project"){
        Feature.save({featureId: $scope.features[$scope.activeFeature]._id }, {entityId: id}, function(result){
          resultHandler.process(result);
        });
      }
    };

    $scope.saveFeature = function(){
      Feature.save({featureId: $scope.features[$scope.activeFeature]._id }, $scope.features[$scope.activeFeature], function(result){
        resultHandler.process(result);
      });
    };

    $scope.highlightRow = function(id){
      if($scope.features[$scope.activeFeature].entityId==id){
        return true;
      }
      return false;
    }
  }]);

  app.controller("homeController", ["$scope", "$resource", "$state", "$stateParams", "userPermissions", "resultHandler", function($scope, $resource, $state, $stateParams, userPermissions, resultHandler){
    var Feature = $resource("api/features/:featureId", {featureId: "@featureId"});
    var Project = $resource("api/projects/:projectId", {projectId: "@projectId"});
    var Article = $resource("api/articles/:articleId", {articleId: "@articleId"});

    $scope.featuredProject = {};
    $scope.featuredArticle = {};

    Feature.get({}, function(result){
      if(resultHandler.process(result)){
        $scope.features = result.data;
        $scope.featureInfo = result;
        delete $scope.featureInfo["data"];

        //get the featured content
        for(var f in $scope.features){
          var entityId = $scope.features[f].entityId;
          switch ($scope.features[f].name){
            case "project":
            $scope.featuredProject.comment = $scope.features[f].comment;
              Project.get({projectId: entityId}, function(result){
                if(resultHandler.process(result)){
                  $scope.featuredProject.project = result.data[0];
                }
              });
              break;
            case "article":
            $scope.featuredArticle.comment = $scope.features[f].comment;
              Article.get({articleId: entityId}, function(result){
                if(resultHandler.process(result)){
                  $scope.featuredArticle.article = result.data[0];
                }
              });
              break;
          }
        }
      }
    });

    //Get the latest 5 projects
    Project.get({sort: 'dateline', sortOrder:'-1', limit:'3'}, function(result){
      if(resultHandler.process(result)){
        $scope.latestProjects = result.data;
      }
    });

    Article.get({sort: 'dateline', sortOrder:'-1', limit:'3'}, function(result){
      if(resultHandler.process(result)){
        $scope.latestArticles = result.data;
      }
    });

  }]);

  app.controller("projectController", ["$scope", "$resource", "$state", "$stateParams", "userPermissions", "resultHandler", "paging", function($scope, $resource, $state, $stateParams, userPermissions, resultHandler, paging){
    var Project = $resource("api/projects/:projectId", {projectId: "@projectId"});
    var ProjectCategory = $resource("api/projectcategories/:projectCategoryId", {projectCategoryId: "@projectCategoryId"});

    $scope.permissions = userPermissions;
    $scope.pageSize = 20;
    $scope.projects = [];

    console.log('params - ',$stateParams);

    $scope.sortOptions = {
      dateline: {
        name: "Last Updated",
        order: -1,
        field: "dateline"
      },
      title: {
        name: "A-Z",
        order: 1,
        field: "title"
      },
      lastpost: {
        name: "Most recent comments",
        order: -1,
        field: "lastpost"
      }
    };

      $scope.sort = $scope.sortOptions.dateline;

    $scope.query = {
      limit: $scope.pageSize //overrides the server side setting
    };
    if($stateParams.page){
      $scope.query.skip = ($stateParams.page-1) * $scope.pageSize;
    }
    if($stateParams.sort){
      $scope.sort = $scope.sortOptions[$stateParams.sort];
      $scope.query.sort = $scope.sort.field;
      $scope.query.sortOrder = $scope.sort.order;
    }
    if($stateParams.projectId){
      $scope.query.projectId = $stateParams.projectId;
    }

    ProjectCategory.get({}, function(result){
      if(resultHandler.process(result)){
        $scope.projectCategories = result.data;
        $scope.projectCategoryInfo = result;
        delete $scope.projectCategoryInfo["data"];
      }
    });

    $scope.getProjectData = function(query){
      Project.get(query, function(result){
        if(resultHandler.process(result)){
          $scope.projects = result.data;
          $scope.projectInfo = result;
          delete $scope.projectInfo["data"];
        }
      });
    };

    $scope.getPageText = function(){
      if($scope.projects[0] && $scope.projects[0].pagetext){
        return marked($scope.projects[0].pagetext);
      }
    };

    $scope.getProjectData($scope.query); //get initial data set
  }]);

  app.controller("commentController", ["$scope", "$resource", "$state", "$stateParams", "userPermissions", "resultHandler", function($scope, $resource, $state, $stateParams, userPermissions, resultHandler){
    var Comment = $resource("api/comments/:commentId", {commentId: "@commentId"});

    $scope.comments = [];

    $scope.getCommentData = function(query){
      Comment.get(query, function(result){
        if(resultHandler.process(result)){
          $scope.comments = result.data;
          $scope.commentInfo = result;
          delete $scope.commentInfo["data"];
        }
      });
    };

    if($stateParams.projectId){
      $scope.getCommentData({threadid: $stateParams.projectId});
    }

  }]);


})();
