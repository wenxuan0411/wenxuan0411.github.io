/**浏览器搞笑标题**/
 var OriginTitle = document.title;
 var titleTime;
 document.addEventListener('visibilitychange', function () {
     if (document.hidden) {
         $('[rel="icon"]').attr('href', "/img/fluid.png");
         document.title = '看不到我~';
         clearTimeout(titleTime);
     }
     else {
         $('[rel="icon"]').attr('href', "/img/avatar.jpg");
         document.title = '欢迎回来~' + OriginTitle;
         titleTime = setTimeout(function () {
             document.title = OriginTitle;
         }, 2000);
     }
 });