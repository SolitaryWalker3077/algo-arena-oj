package com.oj.system.entity;

import io.swagger.v3.oas.models.security.SecurityScheme;
import lombok.Data;

@Data
public class LoginUser {

    private Integer identity;  //identity 1 表示普通用户   2 表示管理员用户

}
