import * as NodeFetch from "node-fetch";

const yaleAuthToken =
  "VnVWWDZYVjlXSUNzVHJhcUVpdVNCUHBwZ3ZPakxUeXNsRU1LUHBjdTpkd3RPbE15WEtENUJ5ZW1GWHV0am55eGhrc0U3V0ZFY2p0dFcyOXRaSWNuWHlSWHFsWVBEZ1BSZE1xczF4R3VwVTlxa1o4UE5ubGlQanY5Z2hBZFFtMHpsM0h4V3dlS0ZBcGZzakpMcW1GMm1HR1lXRlpad01MRkw3MGR0bmNndQ==";
var refresh_token = "";
var access_token = "";

const urls = {
  auth: "https://mob.yalehomesystem.co.uk/yapi/o/token/",
  getStatus: "https://mob.yalehomesystem.co.uk/yapi/api/panel/mode/",
  setStatus: "https://mob.yalehomesystem.co.uk/yapi/api/panel/mode/",
  services: "https://mob.yalehomesystem.co.uk/yapi/services/"
};

export namespace MediaType {
  export const enum Application {
    json = "application/json",
    xml = "application/xml",
    formurlencoded = "application/x-www-form-urlencoded"
  }

  export const enum Text {
    plain = "text/plain",
    html = "text/html"
  }
}

function headersWithAccessToken(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: `${MediaType.Application.json}, ${MediaType.Application.xml}, ${MediaType.Text.plain}, ${MediaType.Text.html}, *.*`,
    "Content-Type": `${MediaType.Application.formurlencoded}; charset=UTF-8`
  };
}

export function getAccessToken(username: string, password: string) {
  let payload = `grant_type=password&username=${encodeURIComponent(
    username
  )}&password=${encodeURIComponent(password)}`;
  return fetch(urls.auth, {
    method: "POST",
    body: payload,
    headers: {
      Authorization: "Basic " + yaleAuthToken,
      Accept: "application/json, application/xml, text/plain, text/html, *.*",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    }
  })
    .then(res => res.json())
    .then(json => {
      if (json.error === "invalid_grant") {
        return Promise.reject(json.error_description);
      } else {
        fetch(urls.services, {
          method: "GET",
          headers: headersWithAccessToken(access_token)
        });
        return json.access_token;
      }
    });
}

export const enum AlamState {
  arm = "arm",
  home = "home",
  disarm = "disarm"
}

export function setStatus(access_token: string, alarmstate: AlamState) {
  return new Promise((resolve, reject) => {
    if (!access_token || access_token.length === 0) {
      reject("Please call getAccessToken to get your access token first");
    }

    if (
      alarmstate !== "arm" &&
      alarmstate !== "home" &&
      alarmstate !== "disarm"
    ) {
      reject("Invalid mode passed to setStatus");
    }

    return fetch(urls.setStatus, {
      method: "POST",
      body: `area=1&mode=${alarmstate}`,
      headers: headersWithAccessToken(access_token)
    })
      .then(res => res.json())
      .then(json => {
        let setStatus = json.data.cmd_ack;
        resolve(setStatus);
      });
  });
}

export function getStatus(access_token: string) {
  return new Promise((resolve, reject) => {
    if (!access_token || access_token.length === 0) {
      reject("Please call getAccessToken to get your access token first");
    }

    return fetch(urls.getStatus, {
      method: "GET",
      headers: headersWithAccessToken(access_token)
    })
      .then(res => res.json())
      .then(json => {
        let alarmState = json.data[0].mode;
        resolve(alarmState);
      });
  });
}
