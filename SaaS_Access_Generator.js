// Get SaaS Parameters
//------------------------------------------
const saasSite = "SaaS O365"; // Site with DNS Forwarder
const saasHosts = "microsoft.com,live.com"; // Domains for your SaaS providers
const saasPorts = "80,443" // Port needed to access the SaaS
//------------------------------------------

var scripthost = "";

saasHosts.split(",").forEach((element, index) => {
    scripthost += "domain://" + element + ",";
});

// Get Site ID 

var entityType = "sites"; 
var entities = await fetch("/admin/" + entityType, { headers: getHeaders() }).then(response => response.json()).then(json => json.data); 


var saasId = entities.filter(entities => entities.name === saasSite).map(entity => entity.id)[0]; 
if (saasId == null){
  console.log("Site " + saasSite + " not defined in Controller")
  return
}

var saasDNSIp = entities.filter(entities => entities.name === saasSite).map(entity => entity.nameResolution.dnsForwarding.siteIpv4)[0]; 
if (saasDNSIp == null){
  console.log("DNS Forward not configure on site " + saasSite)
  return
}

entityType = "conditions"; 
entities = await fetch("/admin/" + entityType, { headers: getHeaders() }).then(response => response.json()).then(json => json.data); 
var saasConId = entities.filter(entities => entities.name === "Always").map(entity => entity.id)[0];

// Entitlement Scripts 

entityType = "entitlement-scripts"; 
entities = await fetch("/admin/" + entityType, { headers: getHeaders() }).then(response => response.json()).then(json => json.data);

var scripthostaux = "return [";
scripthost.split(",").forEach((element, index) => {
    scripthostaux += "'"+ element + "',";
});
scripthostaux += "]";

entity={'name': 'SaaSHostsScripted', 'notes': 'Hosts needed to communicate with Saas', 'tags': ['saas-scripted'], 'type': 'host', 'expression': scripthostaux  }

var response = await fetch("/admin/" + entityType, { method: "POST", headers: getHeaders(), body:JSON.stringify(entity) }); 
 if (response.ok) { 
      console.log( "created Entitlement Script Hosts successfully"); 
 } 
 else { 
      console.log( "failed Entitlement Script Hosts ");
 } 


var scriptport = "return [";

saasPorts.split(",").forEach((element, index) => {
    scriptport += "'"+ element + "',";
});


scriptport += "]";

entity={'name': 'SaaSPortsScripted', 'notes': 'Ports needed to communicate with SaaS', 'tags': ['saas-scripted'], 'type': 'portOrType', 'expression': scriptport }

response = await fetch("/admin/" + entityType, { method: "POST", headers: getHeaders(), body:JSON.stringify(entity) }); 
 if (response.ok) { 
      console.log( "created Entitlement Script Ports successfully"); 
 } 
 else { 
      console.log( "failed Entitlement Script Ports");
 } 

 // Entitlement 

entityType = "entitlements"; 
entities = await fetch("/admin/" + entityType, { headers: getHeaders() }).then(response => response.json()).then(json => json.data);

entity={'name': 'SaaS Scripted', 'tags': ['saas-scripted'], 'site': saasId, 'actions': [{'type': 'IpAccess', 'action': 'allow', 'hosts': ['script://SaaSHostsScripted'], 'subtype': 'tcp_up', 'ports': ['script://SaaSPortsScripted']}], 'conditions': [saasConId]}

response = await fetch("/admin/" + entityType, { method: "POST", headers: getHeaders(), body:JSON.stringify(entity) }); 
 if (response.ok) { 
      console.log( "created Entitlement Access successfully"); 
 } 
 else { 
      console.log( "failed Entitlement Access")
 } 

entity={'name': 'SaaS DNS Scripted', 'tags': ['saas-scripted'], 'site': saasId, 'actions': [{'type': 'IpAccess', 'action': 'allow', 'hosts': [saasDNSIp], 'subtype': 'udp_up', 'ports': [53]}], 'conditions': [saasConId]}

response = await fetch("/admin/" + entityType, { method: "POST", headers: getHeaders(), body:JSON.stringify(entity) }); 
 if (response.ok) { 
      console.log( "created Entitlement DNS successfully"); 
 } 
 else { 
      console.log( "failed Entitlement DNS");
 } 

 // Policies 

entityType = "policies"; 
entities = await fetch("/admin/" + entityType, { headers: getHeaders() }).then(response => response.json()).then(json => json.data);

var saasDNShostaux = {};
var saasDNShost = [];

for (var i = 0; i < saasHosts.split(",").length; i++) { 
    saasDNShostaux = {"domain": saasHosts.split(",")[i], "servers": [saasDNSIp]}
    saasDNShost.push(saasDNShostaux);
}

entity={'name': 'SaaS DNS Scripted', 'tags': ['saas-scripted'], 'expression': 'var result = false; if (claims.user.username === "admin") { result = true; } else { return false; } return result;', 'type': 'Dns', 'entitlementLinks': ['saas-scripted']}

entity.dnsSettings = saasDNShost;

response = await fetch("/admin/" + entityType, { method: "POST", headers: getHeaders(), body:JSON.stringify(entity) }); 
 if (response.ok) { 
      console.log( "created Policy DNS successfully"); 
 } 
 else { 
      console.log( "failed Policy DNS");
 } 
