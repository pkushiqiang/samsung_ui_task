(function($) {

    var oldContent;
    var cursorX;
    var cursorY;

    var entitiesMap = {};
    var titles = [];

    var spans;
    var rects;

    var curSpan;
    var observe;

    var bigSearch = true;
    var smallTitles = [];
    var smallTitleSet = {};

    function get_browser_info() {
        var ua = navigator.userAgent,
            tem, M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if (/trident/i.test(M[1])) {
            tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
            return {
                name: 'IE',
                version: (tem[1] || '')
            };
        }
        if (M[1] === 'Chrome') {
            tem = ua.match(/\bOPR\/(\d+)/)
            if (tem != null) {
                return {
                    name: 'Opera',
                    version: tem[1]
                };
            }
        }
        M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
        if ((tem = ua.match(/version\/(\d+)/i)) != null) {
            M.splice(1, 1, tem[1]);
        }
        return {
            name: M[0],
            version: M[1]
        };
    }

    var browser = get_browser_info();
    // console.log(browser);

    if (window.attachEvent) {
        observe = function(element, event, handler) {
            element.attachEvent('on' + event, handler);
        };
    } else {
        observe = function(element, event, handler) {
            element.addEventListener(event, handler, false);
        };
    }

    function initInputArea() {
        var text = document.getElementById('inputArea');

        function resize() {
                text.style.height = 'auto';
                text.style.height = text.scrollHeight + 'px';
            }
            /* 0-timeout to get the already changed text */
        function delayedResize() {
                window.setTimeout(resize, 0);
            }
            //  observe(text, 'change',  resize);
        observe(text, 'cut', delayedResize);
        //   observe(text, 'paste',   delayedResize);
        observe(text, 'drop', delayedResize);
        observe(text, 'keydown', delayedResize);

        observe(text, 'input', resize);
    }

    function adjustHighlighter() {
        $('#highlighter').offset($('#inputArea').offset());
        $('#highlighter').height($('#inputArea').height());
        $('#highlighter').width($('#inputArea').width());
    }

    function initEntites() {
        for (var i = 0; i < entitydb.length; i++) {
            var obj = entitydb[i];
            entitiesMap[obj.title.toLowerCase()] = i;
            titles.push(obj.title.toLowerCase());
            //  console.log(obj.title);
        }

        titles.sort(function(a, b) {
            if (a.length > b.length) {
                return -1;
            } else if (a.length < b.length) {
                return 1;
            } else {
                return a - b;
            }
        });
    }

    function processBrowers() {
        if (browser.name == "Firefox") {
            $('#inputArea').css("whiteSpace", "pre-wrap");
            $('#highlighter').css("whiteSpace", "pre-wrap");
            $('#copyDiv').css("whiteSpace", "pre-wrap");
        }
        console.log($.support);
    }

    $(document).ready(function() {
        initEntites();
        processBrowers();
        $("#info").hide();
        initInputArea();
        adjustHighlighter();

        $("#inputArea").css('height', 'auto');
        $("#inputArea").height($("#inputArea").prop("scrollHeight"));

        txtChange();
        oldContent = $("#inputArea").val();

        setInterval(function() {
            bigSearch = true;
        }, 3000);

        setInterval(function() {
            bigSearch = true;
            txtChange();
        }, 8000);
    });

    $('#inputArea').click(function(evt) {
        // console.log("evt = ", evt, evt.clientX );
        var x = evt.clientX,
            y = evt.clientY;
        $('#highlighter').css("pointerEvents", "auto");
        ele = document.elementFromPoint(x, y);
        $('#highlighter').css("pointerEvents", "none");

        //  console.log(ele); 
        if (ele.tagName == "SPAN") {
            var eid = ele.getAttribute("data-entity-id");
            clickHighlight(eid);
        }
    });

    $("#inputArea").on('input', function() {
        txtChange();
    });

    function txtChange() {
        var content = $("#inputArea").val();
        //   console.log(content);

        if (oldContent == content)
            return;
        oldContent = content;
        var ranges = [];
        var found = [];
        var tmpTitles = (bigSearch) ? titles : smallTitles;

        var newContent = content;
        newContent = getShowText(content, tmpTitles, ranges, found);

        $('#highlighter').html(newContent);
        $('#copy').html(newContent);

        if (bigSearch) {
            bigSearch = false;
            addToSmallTitles(found);
        }

        scanHigh();
    }

    function scanHigh() {
        spans = [];
        var children = $('#highlighter').children();
        for (var i = 0; i < children.length; i++) {
            var ele = children[i];
            var name = ele.tagName;
            //    console.log(name);
            if (name == "SPAN") {
                spans.push(ele);
            }
        }
        //  console.log(spans);    
        rects = [];
    }

    $('#inputArea').mousemove(function(evt) {

        var offX = evt.offsetX == undefined ? evt.originalEvent.layerX : evt.offsetX;
        var offY = evt.offsetY == undefined ? evt.originalEvent.layerY : evt.offsetY;

        //  console.log(offX, offY);
        var foundSpan = false;
        var span;
        for (var i = 0; i < spans.length; i++) {
            span = spans[i];
            if ((offX >= span.offsetLeft) && (offX <= span.offsetLeft + span.offsetWidth) && (offY >= span.offsetTop) && (offY <= span.offsetTop + span.offsetHeight)) {
                //  console.log( offX,offY );   
                //  console.log(spans[i]);               
                foundSpan = true;
                break;
            }
        } // for

        if (foundSpan) {
            if (!(curSpan === span)) {
                showInfo(span);
            }
        } else {
            hideInfo();
        }
    });

    function showInfo(span) {
        //  console.log(span);
        curSpan = span;
        var eid = span.getAttribute("data-entity-id");
        //  console.log(eid);

        var entity = entitydb[eid];
        //  console.log("mouse over >>" + entity.title);  
        $('#title').html('<h3>' + entity.title + '</h3>');
        $("#desc").html(entity.description);
        $('#pic').attr("src", entity.image);
        $('#pic').hide();

        $('#info').fadeIn();
    }

    function hideInfo() {
        curSpan = null;
        $("#info").fadeOut();
    }

    function addToSmallTitles(found) {
        for (var i = 0; i < found.length; i++) {
            var title = found[i].title;

            if (!(title in smallTitleSet)) {
                smallTitleSet[title] = true;
                smallTitles.push(title);
            }
        }

        smallTitles.sort(function(a, b) {
            if (a.length > b.length) {
                return -1;
            } else if (a.length < b.length) {
                return 1;
            } else {
                return a - b;
            }
        });
    }

    function getShowText(content, tmpTitles, ranges, found) {

        for (var i = 0; i < tmpTitles.length; i++) {
            findEntity(content, tmpTitles[i], ranges, found);
        }
        // console.log(ranges);
        var newContent = replaceEntity(content, found);
        //  console.log(newContent);
        return newContent;
    }

    function replaceEntity(content, found) {
        found.sort(function compare(a, b) {
            return a.range[0] - b.range[0];
        });
        //  console.log(found);

        var newContent = '';
        var p = 0;
        for (var i = 0; i < found.length; i++) {
            var title = found[i].title;
            var range = found[i].range;
            var str1 = content.substring(p, range[0]);
            newContent += str1;
            var oriTitle = content.substring(range[0], range[1]);
            var eid = entitiesMap[title];
            var span = '<span class="entity" ' + ' data-entity-id="' + eid + '" >' + oriTitle + '</span>';
            newContent += span;
            p = range[1];
        }
        newContent += content.substring(p, content.length);
        return newContent;
    }

    function findEntity(lowContent, title, ranges, found) {
        
        var  restr = '\\b'+title+'\\b';
      //  console.log( "restr= " + restr);
        var myRe = new RegExp(restr,'ig');       
        var res = myRe.exec(lowContent);         
        while (res) {
            var i = res.index;
            var range = [i, i + title.length];
      //      console.log(res.index);
            if (isValidRange(ranges, range)) {                 
                ranges.push(range);
                found.push({
                    "title": title,
                    "range": range
                });
            }
            res = myRe.exec(lowContent);        
        }             
    }

    function isValidRange(ranges, range) {
        var s=range[0], e=range[1];
        for (var j = 0; j < ranges.length; j++) {
            var r = ranges[j];
            if ( (s >= r[0] && s<= r[1] ) || (e >= r[0] && e <= r[1]) ) 
                return false;
        }
        return true;
    }

    function clickHighlight(eid) {
        var entity = entitydb[eid];
        var url = entity.url;
        //   console.log(url);
        var win = window.open(url, '_blank');
        win.focus();
    }

    $('#pic').load(function() {
        $('#pic').show();
    });

})(jQuery);
