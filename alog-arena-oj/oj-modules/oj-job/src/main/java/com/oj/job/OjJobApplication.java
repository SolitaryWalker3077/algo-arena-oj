package com.oj.job;

import org.apache.ibatis.annotations.Mapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.oj.**.mapper")
public class OjJobApplication {
    public static void main(String[] args) {
        SpringApplication.run(OjJobApplication.class,args);
    }
}
