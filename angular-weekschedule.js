'use strict';

angular.module('angular-weekschedule', [])
  .directive('weekSchedule', function ($filter) {

    var s;

    var blocksPerHour = 2;
    var secondsPerBlock = 3600/blocksPerHour;

    var dayStartS = 0*3600;
    var dayEndS = 24*3600;
    var gridSRange = dayEndS - dayStartS;


    var width = 800;
    var height = 600;
    var gridOffsetX = 40;
    var gridOffsetY = 30;
    var gridWidth = width-gridOffsetX;
    var gridHeight = height-gridOffsetY;
    var blockWidth = gridWidth/7;
    var blockHeight = gridHeight/(blocksPerHour*(dayEndS-dayStartS)/3600);
    var hourAxisOffsetX = 6;
    var dayAxisOffsetY = 20;
    var gridTransform = new Snap.Matrix();
    gridTransform.translate(gridOffsetX, gridOffsetY);

    var hourAxisTransform = new Snap.Matrix();
    hourAxisTransform.translate(0, -(dayStartS/gridSRange)*gridHeight);

    var toggleMap = new Array(24*7*blocksPerHour);

    var toggling = true;
    var dragging = false;

    var calculateGlobals = function(scope){
      blocksPerHour = scope.blocksPerHour || 2;
      secondsPerBlock = 3600/blocksPerHour;

      dayStartS = 0*3600;
      dayEndS = 24*3600;
      gridSRange = dayEndS - dayStartS;

      width = scope.width || 800;
      height = scope.height || 600;
      gridWidth = width-gridOffsetX;
      gridHeight = height-gridOffsetY;
      blockWidth = gridWidth/7;
      blockHeight = gridHeight/(blocksPerHour*(gridSRange)/3600);

      hourAxisTransform = new Snap.Matrix();
      hourAxisTransform.translate(0, -(dayStartS/gridSRange)*gridHeight);

      toggleMap = new Array(24*7*blocksPerHour);

    };


    return {
      template: '<svg id="weekschedule" ng-attr-width="{{width}}" ng-attr-height="{{height}}"></svg>',
      restrict: 'A',
      scope:{
        availabilityBlocks: '=',
        width: '=',
        height: '=',
        blocksPerHour: '='
      },
      link: function(scope, element, attrs) {

        var isTouch = function (event) {
          return event.type.indexOf('touch') > -1;
        }

        var mouseDown = function(block, index){
          return function(event){
            if(isTouch(event)) { return;}
            dragging = true;
            toggling = !toggleMap[index];
            toggleMap[index] = toggling;
            block.toggleClass('toggled', toggling);
          };
        };

        var mouseOver = function(block, index){
          return function(event){
            if(isTouch(event)) { return;}
            if (dragging){
              toggleMap[index] = toggling;
              block.toggleClass('toggled', toggling);
            }
          };
        };

        var mouseUp = function(block, index){
          return function(event){
            if(isTouch(event)) { return;}
            dragging = false;
            scope.availabilityBlocks = saveGrid();
            scope.$apply();
          };
        };

        var touchEnd = function(block, index){
          return function(event){
            toggleMap[index] = !toggleMap[index];
            event.preventDefault();
            scope.availabilityBlocks = saveGrid();
            scope.$apply();
          };
        };


        var initToggleMap = function(){
         for(var i=0;i<toggleMap.length;i++){
            toggleMap[i] = false;
          };
        };

        var updateToggleMap = function(availabilityBlocks){
          _.each(availabilityBlocks, function(ab){
            var startBlock= Math.floor(ab.start_at_s/secondsPerBlock);
            var durationBlocks = ab.duration/secondsPerBlock;

            for (var t=startBlock;t<startBlock+durationBlocks;t++){
              toggleMap[t]=true;
            }
          });
        };

        var drawGrid = function(){
          
          for(var day=0; day<7; day++){
            for(var hourPart=0;hourPart<24*blocksPerHour;hourPart++){

              // Calculate index in toggleMap
              var index = day*24*blocksPerHour+hourPart;

              // Draw block
              var block = s.rect(day*blockWidth,hourPart*blockHeight,blockWidth,blockHeight);
              block.addClass('weekscheduleblock');
              block.toggleClass('toggled', toggleMap[index]);
              block.transform(gridTransform);

              // Set data attributes to conveniently update fast
              block.attr({'data-day': day, 'data-hourpart': hourPart});

              // Set touch event handlers for block
              block.touchend(touchEnd(block, index));

              // Set mouse event handlers for block
              block.mousedown(mouseDown(block, index));
              block.mouseover(mouseOver(block, index));
              block.mouseup(mouseUp(block, index));

            }
          }
        };

        var drawGridUpdate = function(){
          var blocks = s.selectAll('rect.weekscheduleblock');
          _.each(blocks, function(block) {
            var day = parseInt(block.attr('data-day'));
            var hourPart = parseInt(block.attr('data-hourpart'));
            block.toggleClass('toggled', toggleMap[day*24*blocksPerHour+hourPart]);
          });
        };

        // returns availabilityBlocks derived from toggleMap
        var saveGrid = function(){
          var availabilityBlocks = [];
          var previousToggled;
          var toggleStreakStart;

          for (var i=0;i<toggleMap.length;i++){
            if (previousToggled && !toggleMap[i]){
              availabilityBlocks.push({
                start_at_s: toggleStreakStart*secondsPerBlock,
                duration: (i-toggleStreakStart)*secondsPerBlock-1
              });
            }

            if (toggleMap[i] && !previousToggled){
              toggleStreakStart = i;
            }
            previousToggled = toggleMap[i];
          }

          // Check if streak is pending (happens if sunday last block is checked)
          if(previousToggled){
            availabilityBlocks.push({
                start_at_s: toggleStreakStart*secondsPerBlock,
                duration: (7*24*blocksPerHour-toggleStreakStart)*secondsPerBlock-1
              });
          }

          return availabilityBlocks;
        };

        s = Snap('#weekschedule');

        calculateGlobals(scope);

        scope.$watchCollection('availabilityBlocks', function(newValue){
          if (newValue !== undefined){
            updateToggleMap(newValue);
            drawGridUpdate();
          }
        });

        //Draw hour scale
        for(var hour=0;hour<24;hour++){
          var t = s.text(hourAxisOffsetX, gridOffsetY + blockHeight * blocksPerHour * hour + 6, hour.toString()+'h');
          t.transform(hourAxisTransform);
          t.addClass('houraxis');
        }

        //Draw day scale
        for(var day=0;day<7;day++){
          var d = new Date(2014,9,20+day);
          var dStr = $filter('date')(d, 'EEEE');
          var t = s.text(gridOffsetX+day*blockWidth, dayAxisOffsetY, dStr);
          t.addClass('timeaxis');
        }

        initToggleMap();
        drawGrid();
      }
    };
  });
