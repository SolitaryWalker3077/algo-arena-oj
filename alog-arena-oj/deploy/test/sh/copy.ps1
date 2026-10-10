rm ../c-oj-jar/gateway/oj-gateway.jar
rm ../c-oj-jar/friend/oj-friend.jar
rm ../c-oj-jar/job/oj-job.jar
rm ../c-oj-jar/judge/oj-judge.jar
rm ../c-oj-jar/system/oj-system.jar


copy ../../../oj-gateway/target/oj-gateway-1.0-SNAPSHOT.jar ../c-oj-jar/gateway/oj-gateway.jar
copy ../../../oj-modules/oj-judge/target/oj-judge-1.0-SNAPSHOT.jar ../c-oj-jar/judge/oj-judge.jar
copy ../../../oj-modules/oj-friend/target/oj-friend-1.0-SNAPSHOT.jar ../c-oj-jar/friend/oj-friend.jar
copy ../../../oj-modules/oj-job/target/oj-job-1.0-SNAPSHOT.jar ../c-oj-jar/job/oj-job.jar
copy ../../../oj-modules/oj-system/target/oj-system-1.0-SNAPSHOT.jar ../c-oj-jar/system/oj-system.jar
pause