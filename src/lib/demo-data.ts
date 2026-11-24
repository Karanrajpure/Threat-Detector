import type { Asset, Exposure, Control } from "./scoring";
const A = (id: string, name: string, scenario: string, type: string, vulnerability: number, criticality: number, exposure: Exposure, controls: Control[], links: string[]): Asset => ({ id, name, scenario, type, vulnerability, criticality, exposure, controls, links, cvss: null });
/** The 15 demo campus lab assets — same as the server seed in create_workspace(). */
export const demoAssets = (): Asset[] => [
  A("1","LAB-WEB-01 (DVWA)","Web App Pentesting","Web application",9.1,4,"campus",[],["2","14"]),
  A("2","LAB-DB-02 MySQL","SQL Injection Lab","Database",8.2,5,"internal",[],["7"]),
  A("3","Kali Attack Box 07","Ethical Hacking","Security testing machine",4.3,2,"campus",["patch"],["4","1"]),
  A("4","Metasploitable2-A","Exploit Development","Linux server",9.8,3,"isolated",[],[]),
  A("5","Moodle Staging","LMS Hardening","Web application",6.5,5,"internet",["patch"],["2","9"]),
  A("6","Cisco ASA Lab FW","Network Defence","Firewall",7.4,5,"campus",[],["7","12"]),
  A("7","AD-DC-LAB","Active Directory Attacks","Active Directory server",8.8,5,"internal",[],["12","9"]),
  A("8","IoT Camera Cluster","IoT Security","IoT device",7.9,2,"campus",[],["15"]),
  A("9","SIEM Splunk Node","SOC Analysis","Linux server",5.2,4,"internal",["patch","mfa"],["7"]),
  A("10","Raspberry Pi Honeypot","Threat Intelligence","Linux server",6.1,1,"internet",[],["9"]),
  A("11","Wi-Fi AP LAB-3F","Wireless Security","Wi-Fi access point",7.0,3,"campus",[],["7","8","3"]),
  A("12","Forensics Workstation","Digital Forensics","Windows client",3.8,4,"isolated",["patch","edr"],[]),
  A("13","Docker CI Runner","DevSecOps","Virtualization host",8.5,4,"internet",[],["6","14"]),
  A("14","Juice Shop VM","Secure Coding","Web application",9.3,2,"internal",[],["2"]),
  A("15","SCADA Simulator","ICS Security","PLC simulator",8.9,5,"isolated",[],[]),
];
