//This route is for hiding a specific record on the specified entity
//Requires "hide" permissions on the specified entity
//Sets the 'approved' field to false making it invisible to users without 'approve' permissions
var MasterController = require("../../controllers/master"),
    entities = require("../entityConfig"),
    Error = require("../../controllers/error"),
    mailer = require('../../controllers/emailer');

module.exports = function(req, res){
  var query = req.query || {};
  query["_id"] = req.params.id;
  var entity = req.params.entity;
  var user = req.user;
  var userPermissions = req.user.role.permissions[entity];
  //check that the user has sufficient permissions for this operation
  if(!userPermissions || userPermissions.hide!=true){
    res.json(Error.insufficientPermissions());
  }
  else{
    MasterController.get(req.query, query, entities[entity], function(response){    //This ensures that users can only update records they own (where applicable)
      if(response.data.length > 0){
        MasterController.save(query, {approved: false, hide_comment: req.body.hideComment}, entities[entity], function(result){
          //send an email to the owner to tell them what has happened
          var options = {
            to: "brian.munz@qlik.com",
            subject: "Branch Item Unapproved",
            html: "<p>"+ result.title + " has been unapproved with the following comment - </p>" + req.body.hideComment
          }
          mailer.sendMail(options, function(){

          });
          res.json(result);
        });
      }
      else{
        res.json(Error.noRecord());
      }
    });
  }
};
