(function(){
  "use strict";

  /* ---------------- In-memory data store ---------------- */
  var COLORS = ["#3F6FB0","#E0A93A","#2F6F62","#C1443C","#7A5AA8","#8a8570"];
  var TOTAL_USERS = 96;

  var polls = [
    {
      id: "p1",
      q: "What is your favorite programming language?",
      type: "single",
      options: [
        {label:"Python", votes:40},
        {label:"JavaScript", votes:30},
        {label:"C++", votes:15},
        {label:"Java", votes:10},
        {label:"Other", votes:5}
      ],
      createdAgo: "2 days ago"
    },
    {
      id: "p2",
      q: "Which platform do you use most?",
      type: "single",
      options: [
        {label:"Mobile app", votes:38},
        {label:"Desktop website", votes:27},
        {label:"Tablet", votes:10}
      ],
      createdAgo: "3 days ago"
    },
    {
      id: "p3",
      q: "How satisfied are you with online classes?",
      type: "single",
      options: [
        {label:"Very satisfied", votes:22},
        {label:"Satisfied", votes:24},
        {label:"Neutral", votes:9},
        {label:"Unsatisfied", votes:5}
      ],
      createdAgo: "5 days ago"
    }
  ];

  var votedPolls = {}; // pollId -> true, once voted

  /* ---------------- Tab navigation ---------------- */
  var tabButtons = document.querySelectorAll("nav.tabs button");
  var sections = document.querySelectorAll("main section");
  tabButtons.forEach(function(btn){
    btn.addEventListener("click", function(){
      tabButtons.forEach(function(b){ b.classList.remove("active"); });
      sections.forEach(function(s){ s.classList.remove("active"); });
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
      if(btn.dataset.tab === "results") renderResults();
      if(btn.dataset.tab === "vote") renderVoteCard();
    });
  });

  function goTab(name){
    document.querySelector('nav.tabs button[data-tab="'+name+'"]').click();
  }
  document.getElementById("quickCreate").addEventListener("click", function(){ goTab("create"); });
  document.getElementById("quickVote").addEventListener("click", function(){ goTab("vote"); });

  /* ---------------- Helpers ---------------- */
  function totalVotes(poll){
    return poll.options.reduce(function(a,o){ return a+o.votes; }, 0);
  }
  function allVotes(){
    return polls.reduce(function(a,p){ return a+totalVotes(p); }, 0);
  }
  function esc(s){
    var d=document.createElement("div"); d.innerText = s; return d.innerHTML;
  }

  /* ---------------- Dashboard ---------------- */
  function renderDashboard(){
    document.getElementById("statPolls").innerText = polls.length;
    document.getElementById("statVotes").innerText = allVotes();
    var rate = Math.min(99, Math.round((allVotes() / (TOTAL_USERS*2)) * 100));
    document.getElementById("statRate").innerText = rate + "%";

    var recentEl = document.getElementById("recentList");
    recentEl.innerHTML = "";
    polls.slice().reverse().slice(0,5).forEach(function(p){
      var row = document.createElement("div");
      row.className = "listitem";
      row.innerHTML = '<div><div class="lname">'+esc(p.q)+'</div><div class="lsub">'+esc(p.createdAgo)+'</div></div><span class="badge">'+totalVotes(p)+' votes</span>';
      recentEl.appendChild(row);
    });
    if(polls.length===0){ recentEl.innerHTML = '<div class="emptynote">No polls yet — create one to get started.</div>'; }
  }

  /* ---------------- Create poll ---------------- */
  var optCount = 0;
  function addOptionRow(prefill){
    optCount++;
    var wrap = document.getElementById("optList");
    var row = document.createElement("div");
    row.className = "optrow";
    row.innerHTML = '<input type="text" class="optInput" placeholder="Option '+optCount+'" value="'+(prefill?esc(prefill):'')+'"><button type="button" title="Remove">&times;</button>';
    row.querySelector("button").addEventListener("click", function(){
      row.remove();
      renderPreview();
    });
    row.querySelector("input").addEventListener("input", renderPreview);
    wrap.appendChild(row);
    renderPreview();
  }
  document.getElementById("addOptBtn").addEventListener("click", function(){ addOptionRow(); });

  document.getElementById("typeInput").addEventListener("change", function(){
    var t = this.value;
    var wrap = document.getElementById("optList");
    if(t === "yn"){
      wrap.innerHTML = "";
      optCount = 0;
      addOptionRow("Yes");
      addOptionRow("No");
    }
    renderPreview();
  });
  document.getElementById("qInput").addEventListener("input", renderPreview);

  function currentOptions(){
    return Array.prototype.map.call(document.querySelectorAll(".optInput"), function(i){ return i.value.trim(); }).filter(Boolean);
  }

  function renderPreview(){
    var q = document.getElementById("qInput").value.trim() || "Your question will appear here";
    var opts = currentOptions();
    var type = document.getElementById("typeInput").value;
    var box = document.getElementById("previewBox");
    var html = '<div class="qtext">'+esc(q)+'</div>';
    if(opts.length===0){
      html += '<div class="emptynote">Add at least two options to preview choices.</div>';
    } else {
      opts.forEach(function(o){
        html += '<div class="choice"><div class="dot" style="'+(type==="multi"?"border-radius:3px;":"")+'"></div><span>'+esc(o)+'</span></div>';
      });
    }
    box.innerHTML = html;
  }

  document.getElementById("publishBtn").addEventListener("click", function(){
    var q = document.getElementById("qInput").value.trim();
    var type = document.getElementById("typeInput").value;
    var opts = currentOptions();
    if(!q){ alert("Please enter a question before publishing."); return; }
    if(opts.length < 2){ alert("Add at least two options."); return; }
    var poll = {
      id: "p" + (Date.now()),
      q: q,
      type: type,
      options: opts.map(function(o){ return {label:o, votes:0}; }),
      createdAgo: "Just now"
    };
    polls.push(poll);

    // reset form
    document.getElementById("qInput").value = "";
    document.getElementById("typeInput").value = "single";
    document.getElementById("optList").innerHTML = "";
    optCount = 0;
    addOptionRow(); addOptionRow();
    renderPreview();

    refreshPickers();
    renderDashboard();
    alert("Poll published! Find it under the Vote or Results tab.");
    goTab("vote");
    document.getElementById("votePicker").value = poll.id;
    renderVoteCard();
  });

  /* ---------------- Vote ---------------- */
  var selectedOptionIdx = null;
  var selectedMulti = {};

  function refreshPickers(){
    [["votePicker", true], ["resultPicker", false]].forEach(function(pair){
      var sel = document.getElementById(pair[0]);
      var keep = sel.value;
      sel.innerHTML = "";
      polls.forEach(function(p){
        var opt = document.createElement("option");
        opt.value = p.id;
        opt.innerText = p.q;
        sel.appendChild(opt);
      });
      if(keep && polls.some(function(p){return p.id===keep;})) sel.value = keep;
    });
  }

  document.getElementById("votePicker").addEventListener("change", renderVoteCard);

  function getPoll(id){
    return polls.filter(function(p){ return p.id === id; })[0];
  }

  function renderVoteCard(){
    var id = document.getElementById("votePicker").value;
    var poll = getPoll(id);
    document.getElementById("countedStamp").classList.remove("show");
    if(!poll){
      document.getElementById("voteQ").innerText = "No polls available";
      document.getElementById("voteChoices").innerHTML = "";
      document.getElementById("voteBtn").disabled = true;
      return;
    }
    selectedOptionIdx = null;
    selectedMulti = {};
    document.getElementById("voteQ").innerText = poll.q;
    var wrap = document.getElementById("voteChoices");
    wrap.innerHTML = "";
    var already = votedPolls[poll.id];
    poll.options.forEach(function(o, idx){
      var row = document.createElement("div");
      row.className = "choice";
      row.innerHTML = '<div class="dot" style="'+(poll.type==="multi"?"border-radius:3px;":"")+'"></div><span>'+esc(o.label)+'</span>';
      row.addEventListener("click", function(){
        if(already) return;
        if(poll.type === "multi"){
          selectedMulti[idx] = !selectedMulti[idx];
          row.classList.toggle("picked", !!selectedMulti[idx]);
        } else {
          Array.prototype.forEach.call(wrap.children, function(c){ c.classList.remove("picked"); });
          row.classList.add("picked");
          selectedOptionIdx = idx;
        }
      });
      wrap.appendChild(row);
    });
    document.getElementById("voteBtn").disabled = !!already;
    document.getElementById("voteBtn").innerText = already ? "You already voted" : "Vote";
  }

  document.getElementById("voteBtn").addEventListener("click", function(){
    var id = document.getElementById("votePicker").value;
    var poll = getPoll(id);
    if(!poll || votedPolls[poll.id]) return;
    var picked = false;
    if(poll.type === "multi"){
      Object.keys(selectedMulti).forEach(function(k){
        if(selectedMulti[k]){ poll.options[k].votes++; picked = true; }
      });
    } else {
      if(selectedOptionIdx !== null){ poll.options[selectedOptionIdx].votes++; picked = true; }
    }
    if(!picked){ alert("Pick an option first."); return; }
    votedPolls[poll.id] = true;
    document.getElementById("countedStamp").classList.add("show");
    document.getElementById("voteBtn").disabled = true;
    document.getElementById("voteBtn").innerText = "You already voted";
    renderDashboard();
  });

  /* ---------------- Results ---------------- */
  document.getElementById("resultPicker").addEventListener("change", renderResults);

  function renderResults(){
    var id = document.getElementById("resultPicker").value;
    var poll = getPoll(id);
    var top = allVotes();
    document.getElementById("topPolls").innerText = polls.length;
    document.getElementById("topResp").innerText = top;
    document.getElementById("topRate").innerText = Math.min(99, Math.round((top/(TOTAL_USERS*2))*100)) + "%";

    if(!poll){
      document.getElementById("resultQ").innerText = "No polls available";
      document.getElementById("resultTotal").innerText = "";
      document.getElementById("resultBars").innerHTML = "";
      document.getElementById("pieLegend").innerHTML = "";
      drawPie([]);
      return;
    }
    var tv = totalVotes(poll);
    document.getElementById("resultQ").innerText = poll.q;
    document.getElementById("resultTotal").innerText = tv + " total votes";

    var barsEl = document.getElementById("resultBars");
    barsEl.innerHTML = "";
    poll.options.forEach(function(o, idx){
      var pct = tv ? Math.round((o.votes/tv)*100) : 0;
      var row = document.createElement("div");
      row.className = "resultbar";
      row.innerHTML = '<div class="rlabel"><span>'+esc(o.label)+'</span><span class="mono">'+pct+'%</span></div><div class="track"><div class="fill" style="width:'+pct+'%; background:'+COLORS[idx%COLORS.length]+';"></div></div>';
      barsEl.appendChild(row);
    });

    var legendEl = document.getElementById("pieLegend");
    legendEl.innerHTML = "";
    poll.options.forEach(function(o, idx){
      var pct = tv ? Math.round((o.votes/tv)*100) : 0;
      var li = document.createElement("div");
      li.className = "li";
      li.innerHTML = '<span class="sw" style="background:'+COLORS[idx%COLORS.length]+';"></span>'+esc(o.label)+' — '+pct+'%';
      legendEl.appendChild(li);
    });

    drawPie(poll.options.map(function(o,idx){ return {v:o.votes, c:COLORS[idx%COLORS.length]}; }));
  }

  function drawPie(slices){
    var canvas = document.getElementById("pieCanvas");
    var ctx = canvas.getContext("2d");
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    var total = slices.reduce(function(a,s){return a+s.v;},0);
    var cx=w/2, cy=h/2, r=w/2-6;
    if(total === 0){
      ctx.beginPath();
      ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.fillStyle = "#EDE8DB";
      ctx.fill();
      ctx.fillStyle = "#9a957e";
      ctx.font = "12px IBM Plex Sans";
      ctx.textAlign = "center";
      ctx.fillText("No votes yet", cx, cy+4);
      return;
    }
    var start = -Math.PI/2;
    slices.forEach(function(s){
      var slice = (s.v/total) * Math.PI*2;
      if(s.v === 0) return;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,start,start+slice);
      ctx.closePath();
      ctx.fillStyle = s.c;
      ctx.fill();
      start += slice;
    });
    // inner hole for a ring look
    ctx.beginPath();
    ctx.arc(cx,cy,r*0.52,0,Math.PI*2);
    ctx.fillStyle = "#FFFDF8";
    ctx.fill();
    ctx.fillStyle = "#12213F";
    ctx.font = "600 13px IBM Plex Mono";
    ctx.textAlign = "center";
    ctx.fillText(total, cx, cy+5);
  }

  /* ---------------- Init ---------------- */
  addOptionRow(); addOptionRow();
  refreshPickers();
  renderDashboard();
  renderVoteCard();
  renderResults();

})();