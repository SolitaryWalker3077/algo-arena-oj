package com.oj.api.entity;

import lombok.Data;

@Data
public class UserExeResult {
    private String input;

    private String output;   //期望输出

    private String exeOutput; //实际输出
}
