package com.oj.friend.entity.user.dto;


import lombok.Data;

@Data
public class UserUpdateDto {

    private String headImage;

    private String nickName;

    private Integer sex;

    private String schoolName;

    private String majorName;

    private String phone;

    private String email;

    private String wechat;

    private String introduce;
}
