import React, {useState, useEffect, useRef} from "../../_snowpack/pkg/react.js";
import {
  useRecoilValue,
  useSetRecoilState,
  useRecoilStateLoadable
} from "../../_snowpack/pkg/recoil.js";
import {
  fetchDrivesSelector,
  fetchDriveUsers
} from "../../_reactComponents/Drive/NewDrive.js";
import {
  faChalkboard
} from "../../_snowpack/pkg/@fortawesome/free-solid-svg-icons.js";
import {FontAwesomeIcon} from "../../_snowpack/pkg/@fortawesome/react-fontawesome.js";
import {drivecardSelectedNodesAtom} from "../ToolHandlers/CourseToolHandler.js";
import Button from "../../_reactComponents/PanelHeaderComponents/Button.js";
import DoenetDriveCardMenu from "../../_reactComponents/Drive/DoenetDriveCardMenu.js";
import {driveColors} from "../../_reactComponents/Drive/util.js";
import {useToast} from "../Toast.js";
import ButtonGroup from "../../_reactComponents/PanelHeaderComponents/ButtonGroup.js";
import Textfield from "../../_reactComponents/PanelHeaderComponents/Textfield.js";
export default function SelectedCourse() {
  const selection = useRecoilValue(drivecardSelectedNodesAtom);
  const setDrivesInfo = useSetRecoilState(fetchDrivesSelector);
  const setDrivecardSelection = useSetRecoilState(drivecardSelectedNodesAtom);
  if (selection.length === 1 && selection[0]?.role[0] === "Owner") {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(DriveInfoPanel, {
      key: `DriveInfoPanel${selection[0].driveId}`,
      label: selection[0].label,
      color: selection[0].color,
      image: selection[0].image,
      driveId: selection[0].driveId
    }));
  } else if (selection[0]?.role[0] === "Student") {
    let dIcon = /* @__PURE__ */ React.createElement(FontAwesomeIcon, {
      icon: faChalkboard
    });
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h2", null, dIcon, " ", selection[0].label));
  } else if (selection.length > 1 && selection[0].role[0] === "Owner") {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h2", null, " ", selection.length, " Courses Selected"), /* @__PURE__ */ React.createElement(ButtonGroup, {
      vertical: true
    }, /* @__PURE__ */ React.createElement(Button, {
      width: "menu",
      value: "Duplicate (Soon)",
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(">>>This will Duplicate courses");
      }
    }), /* @__PURE__ */ React.createElement(Button, {
      width: "menu",
      value: "Delete Course",
      alert: true,
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        let selectionArr = [];
        for (let x = 0; x < selection.length; x++) {
          selectionArr.push(selection[x].driveId);
        }
        setDrivesInfo({
          color: "",
          label: "",
          image: "",
          newDriveId: selectionArr,
          type: "delete drive"
        });
        setDrivecardSelection([]);
      }
    })));
  } else if (selection.length === 1 && selection[0]?.role[0] === "Administrator") {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(DriveInfoPanel, {
      key: `DriveInfoPanel${selection[0].driveId}`,
      label: selection[0].label,
      color: selection[0].color,
      image: selection[0].image,
      driveId: selection[0].driveId,
      role: "Administrator"
    }));
  } else {
    return "";
  }
}
const CoursePassword = ({driveId}) => {
  let [password, setPassword] = useState(null);
  useEffect(() => {
    const getPassword = async (driveId2) => {
    };
    getPassword(driveId);
  }, [driveId]);
  return /* @__PURE__ */ React.createElement("div", null, "Set course password (soon)");
};
const DriveInfoPanel = function(props) {
  const [driveLabel, setDriveLabel] = useState(props.label);
  const [panelDriveLabel, setPanelDriveLabel] = useState(props.label);
  const setDrivesInfo = useSetRecoilState(fetchDrivesSelector);
  const driveId = props.driveId;
  const [driveUsers, setDriveUsers] = useRecoilStateLoadable(fetchDriveUsers(driveId));
  const setDrivecardSelection = useSetRecoilState(drivecardSelectedNodesAtom);
  const addToast = useToast();
  if (driveUsers.state === "loading") {
    return null;
  }
  if (driveUsers.state === "hasError") {
    console.error(driveUsers.contents);
    return null;
  }
  let isOwner = false;
  if (driveUsers?.contents?.usersRole === "Owner") {
    isOwner = true;
  }
  let dIcon = /* @__PURE__ */ React.createElement(FontAwesomeIcon, {
    icon: faChalkboard
  });
  let addOwners = null;
  addOwners = /* @__PURE__ */ React.createElement(NewUser, {
    driveId,
    type: "Add Owner",
    setDriveUsers
  });
  let addAdmins = null;
  addAdmins = /* @__PURE__ */ React.createElement(NewUser, {
    driveId,
    type: "Add Admin",
    setDriveUsers
  });
  let selectedOwner = [];
  let selectedAdmin = [];
  let deleteCourseButton = null;
  if (isOwner) {
    deleteCourseButton = /* @__PURE__ */ React.createElement(ButtonGroup, {
      vertical: true
    }, /* @__PURE__ */ React.createElement(Button, {
      width: "menu",
      value: "Delete Course",
      alert: true,
      onClick: () => {
        setDrivesInfo({
          color: props.color,
          label: driveLabel,
          image: props.image,
          newDriveId: [props.driveId],
          type: "delete drive"
        });
        setDrivecardSelection([]);
      }
    }));
  }
  const selectedOwnerFn = (userId, e) => {
    selectedOwner = [];
    for (let selectedOwnerObj of e.target.selectedOptions) {
      for (let owner of driveUsers?.contents?.owners) {
        if (owner.userId === selectedOwnerObj.value) {
          selectedOwner.push(owner);
        }
      }
    }
  };
  const selectedAdminFn = (userId, e) => {
    selectedAdmin = [];
    for (let selectedAdminObj of e.target.selectedOptions) {
      for (let admin of driveUsers?.contents?.admins) {
        if (admin.userId === selectedAdminObj.value) {
          selectedAdmin.push(admin);
        }
      }
    }
  };
  const UserOption = (props2) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("option", {
    value: props2.userId
  }, props2.screenName, " ", props2.email));
  let ownersList = driveUsers?.contents?.owners.length > 0 ? /* @__PURE__ */ React.createElement("select", {
    multiple: true,
    onChange: (e) => {
      selectedOwnerFn(e.target.value, e);
    }
  }, driveUsers?.contents?.owners.map((item, i) => {
    return /* @__PURE__ */ React.createElement(UserOption, {
      userId: item.userId,
      screenName: item.screenName,
      email: item.email
    });
  })) : "";
  let ownerPerms = /* @__PURE__ */ React.createElement(ButtonGroup, {
    vertical: true
  }, /* @__PURE__ */ React.createElement(Button, {
    width: "menu",
    "data-doenet-removebutton": selectedOwner,
    value: "Demote to Admin",
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDriveUsers({
        driveId,
        type: "To Admin",
        userId: selectedOwner,
        userRole: "owner"
      });
    }
  }), /* @__PURE__ */ React.createElement(Button, {
    width: "menu",
    "data-doenet-removebutton": selectedOwner,
    value: "Remove",
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDriveUsers({
        driveId,
        type: "Remove User",
        userId: selectedOwner,
        userRole: "owner"
      });
    }
  }));
  let adminsList = driveUsers?.contents?.admins.length > 0 ? /* @__PURE__ */ React.createElement("select", {
    multiple: true,
    onChange: (e) => {
      selectedAdminFn(e.target.value, e);
    }
  }, driveUsers?.contents?.admins.map((item, i) => {
    return /* @__PURE__ */ React.createElement("option", {
      value: item.userId
    }, item.email);
  })) : "";
  let adminPerms = /* @__PURE__ */ React.createElement(ButtonGroup, {
    vertical: true
  }, /* @__PURE__ */ React.createElement(Button, {
    width: "menu",
    "data-doenet-removebutton": selectedAdmin,
    value: "Promote to Owner",
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDriveUsers({
        driveId,
        type: "To Owner",
        userId: selectedAdmin,
        userRole: "admin"
      });
    }
  }), /* @__PURE__ */ React.createElement(Button, {
    width: "menu",
    "data-doenet-removebutton": selectedAdmin,
    value: "Remove",
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDriveUsers({
        driveId,
        type: "Remove User",
        userId: selectedAdmin,
        userRole: "admin"
      });
    }
  }));
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h2", {
    "data-cy": "infoPanelItemLabel"
  }, dIcon, " ", panelDriveLabel), props.role == "Administrator" ? /* @__PURE__ */ React.createElement(React.Fragment, null, addAdmins, "  ", adminsList) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Textfield, {
    label: "Label",
    vertical: true,
    width: "menu",
    value: driveLabel,
    onChange: (e) => setDriveLabel(e.target.value),
    onKeyDown: (e) => {
      let effectiveDriveLabel = driveLabel;
      if (driveLabel === "") {
        effectiveDriveLabel = "Untitled";
        setDriveLabel(effectiveDriveLabel);
        addToast("Label for the course can't be blank.");
      }
      if (e.keyCode === 13) {
        setPanelDriveLabel(effectiveDriveLabel);
        setDrivesInfo({
          color: props.color,
          label: effectiveDriveLabel,
          image: props.image,
          newDriveId: props.driveId,
          type: "update drive label"
        });
      }
    },
    onBlur: () => {
      let effectiveDriveLabel = driveLabel;
      if (driveLabel === "") {
        effectiveDriveLabel = "Untitled";
        setDriveLabel(effectiveDriveLabel);
        addToast("Label for the course can't be blank.");
      }
      setPanelDriveLabel(effectiveDriveLabel);
      setDrivesInfo({
        color: props.color,
        label: effectiveDriveLabel,
        image: props.image,
        newDriveId: props.driveId,
        type: "update drive label"
      });
    }
  }), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement(CoursePassword, {
    driveId: props.driveId
  }), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("label", null, "Image (soon)", /* @__PURE__ */ React.createElement(DoenetDriveCardMenu, {
    key: `colorMenu${props.driveId}`,
    colors: driveColors,
    initialValue: props.color,
    callback: (color) => {
      setDrivesInfo({
        color,
        label: driveLabel,
        image: props.image,
        newDriveId: props.driveId,
        type: "update drive color"
      });
    }
  })), /* @__PURE__ */ React.createElement("br", null), addOwners, ownersList, /* @__PURE__ */ React.createElement("br", null), ownerPerms, /* @__PURE__ */ React.createElement("br", null), addAdmins, /* @__PURE__ */ React.createElement("br", null), adminsList, adminPerms, deleteCourseButton));
};
function NewUser(props) {
  const [email, setEmail] = useState("");
  const addToast = useToast();
  function addUser() {
    if (email) {
      let callback = function(resp) {
        if (resp.success) {
          props.setDriveUsers({
            driveId: props.driveId,
            type: `${props.type} step 2`,
            email,
            screenName: resp.screenName,
            userId: resp.userId
          });
        } else {
          addToast(resp.message);
        }
      };
      if (validateEmail(email)) {
        props.setDriveUsers({
          driveId: props.driveId,
          type: props.type,
          email,
          callback
        });
        setEmail("");
        addToast(`Added: email ${email}`);
      } else {
        addToast(`Not Added: Invalid email ${email}`);
      }
    }
  }
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", null, "User's Email Address", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("input", {
    type: "text",
    value: email,
    onChange: (e) => {
      setEmail(e.target.value);
    },
    onKeyDown: (e) => {
      if (e.keyCode === 13) {
        addUser();
      }
    },
    onBlur: () => {
      addUser();
    }
  }))), /* @__PURE__ */ React.createElement(Button, {
    value: `${props.type}`,
    onClick: () => addUser()
  }));
}
function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}
