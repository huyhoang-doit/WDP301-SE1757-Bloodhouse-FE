import BlogForm from "@/components/BlogForm";
import Blogs from "@/pages/manager/Blogs";
import BloodInventory from "@/pages/manager/BloodInventory";
import BloodInventoryDetail from "@/pages/manager/BloodInventoryDetail";
import Dashboard from "@/pages/manager/Dashboard";
import Events from "@/pages/manager/Events";
import Gifts from "@/pages/manager/Gifts";
import ReceivedRequests from "@/pages/manager/Received";
import ReceivedDetail from "@/pages/manager/ReceivedDetail";
import Requests from "@/pages/manager/Request";
import Staff from "@/pages/manager/Staff";
import { Children } from "react";

const managerRoutes = [
  {
    path: "",
    element: <Dashboard />,
  },
  {
    path: "inventory",
    children: [
      {
        path: "",
        element: <BloodInventory />,
      },
      {
        path: "detail/:id",
        element: <BloodInventoryDetail />,
      },
    ],
  },
  {
    path: "requests",
    element: <Requests />,
  },
  {
    path: "received",
    element: <ReceivedRequests />,
  },
  {
    path: "received/:id",
    element: <ReceivedDetail />,
  },
  {
    path: "gifts",
    element: <Gifts />,
  },
  {
    path: "staff",
    element: <Staff />,
  },
  {
    path: "blogs",
    element: <Blogs />,
  },
  {
    path: "blogs/create",
    element: <BlogForm />,
  },
  {
    path: "blogs/edit/:id",
    element: <BlogForm isEditing />,
  },
  {
    path: "events",
    element: <Events />,
  },
];

export default managerRoutes;
