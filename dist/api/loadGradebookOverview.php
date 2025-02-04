<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: access");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

include "db_connection.php";

$jwtArray = include "jwtArray.php";
$userId = $jwtArray['userId'];
//TODO: Check if the user is the instructor in the course

if (!isset($_REQUEST["driveId"])) {
    http_response_code(400);
    echo "Database Retrieval Error: No course specified!";
} else {
    $driveId = mysqli_real_escape_string($conn,$_REQUEST["driveId"]);

    $sql = "
    SELECT role
    FROM drive_user
    WHERE driveId = '$driveId'
    and userId = '$userId'
    ";

    $result = $conn->query($sql);  
    $row = $result->fetch_assoc();
    $role = $row['role'];
    //Students should only see their own data
    if ($role == 'Student'){
        $sql = "
        SELECT a.doenetId, ua.credit, ua.userId
        FROM assignment AS a
        JOIN user_assignment AS ua
        ON a.doenetId = ua.doenetId
        WHERE a.driveId = '$driveId'
        AND ua.userId = '$userId'
        ORDER BY a.dueDate
        ";
    }else{
        $sql = "
        SELECT a.doenetId, ua.credit, ua.userId
        FROM assignment AS a
        JOIN user_assignment AS ua
        ON a.doenetId = ua.doenetId
        WHERE a.driveId = '$driveId'
        ORDER BY a.dueDate
        ";
    }

    
      

        $result = $conn->query($sql);  
        $response_arr = array();

        while ($row = $result->fetch_assoc()) {
            array_push($response_arr,
                array(
                    $row['doenetId'],
                    $row['credit'],
                    $row['userId']
                )
            );
        }

        // set response code - 200 OK
        http_response_code(200);

        // make it json format
        echo json_encode($response_arr);
    } 
$conn->close();
?>
           
