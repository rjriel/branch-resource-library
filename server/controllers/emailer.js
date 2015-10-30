nodemailer = require('nodemailer').createTransport();
Templater = require('./templater');
MailText = require('./mailText');

module.exports = {
  sendMail: function(action, entity, data, callbackFn){
    console.log(action);
    console.log(entity);
    console.log(MailText);
    var templateOptions = MailText[action][entity];
    var toTemplate = new Templater(templateOptions.to);
    var subjectTemplate = new Templater(templateOptions.subject);
    var htmlTemplate = new Templater(templateOptions.html);
    var mailOptions = {
      from: 'Qlik Branch <branchadmin@qlik.com>',
      to: toTemplate.getHTML(data),
      subject: subjectTemplate.getHTML(data),
      html: htmlTemplate.getHTML(data)
    }
    console.log(mailOptions);
    nodemailer.sendMail(mailOptions, function(error, info){
      if(error){
        return console.log(error)
      }
      else{
        console.log('Message sent: ' + info.response);
        callbackFn.call();
      }
    });
  }
}
