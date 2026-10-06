package com.oj.friend.entity.user.dto;

import lombok.Data;

@Data
public class UserSubmitDto {
    private Long examId;  //可选

    private Long questionId;

    private Integer programType;  // (0: java  1:cpp 2: golang)

    private String userCode;

}
