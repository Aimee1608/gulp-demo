var gulp = require('gulp');
var gutil = require('gulp-util');
var through = require('through2');
var ScpClient = require('scp2').Client;
var ssh = require('gulp-ssh');
var async = require('async');
var ProgressBar = require('progress');

const PLUGIN_NAME = 'deploy-ssh'

module.exports = function (options) {
  var servers = options.servers;
  var dest = options.dest;
  var shell = options.shell;
  var logPath = options.logPath;

  return through.obj(function (file, enc, callback) {
    if (file.isNull()) {
      callback(null, file);
      return;
    }

    if (file.isStream()) {
      return callback(new gutil.PluginError(PLUGIN_NAME, 'No stream support'));
    }

    var i = 0;
    async.eachSeries(servers, function (server, done) {
      var hostName = server.sshConfig.host;
      gutil.log(PLUGIN_NAME, "start deploy:" + hostName)
      var client = new ScpClient(server.sshConfig);

      var bar = null;
      client.on("transfer", function (buffer, uploaded, total) {
        if (bar == null) {
          bar = new ProgressBar(hostName + ' uploading [:bar] :percent :elapsed s', {
            complete: '=',
            incomplete: ' ',
            width: ,
            total: total
          });
        }
        bar.tick();
      });

      client.write({
        destination: dest,
        content: file.contents
      }, function () {
        ssh(server).shell(shell, { filePath: logPath + "-" + hostName + ".log", autoExit: true }).on('error', function (err) {
          done(err);

          gutil.PluginError(PLUGIN_NAME, err)
        }).on('finish', function () {
          gutil.log(PLUGIN_NAME, "finish deploy:" + hostName);

          done();

          if (++i === servers.length) {
            callback(null, file);
          }
        }).pipe(gulp.dest('logs'));
      });
    });

  });

};