# 指定了基础镜像为openjdk:17.0.2，即使⽤OpenJDK 17.0.2版本的Java环境作为构建的基础。
FROM openjdk:17.0.2
# 拷⻉jar包到容器中
ADD ./oj-gateway.jar ./oj-gateway.jar
# 运⾏jar包 ⽤ Java 运⾏容器内的 oj-gateway.jar 应⽤程序
CMD ["java", "-jar", "oj-gateway.jar"]