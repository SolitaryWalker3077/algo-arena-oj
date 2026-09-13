package com.oj.system.entity.question.vo;


import lombok.Data;



@Data
public class QuestionVO {

    private Long questionId;

    private String title;

    private Integer difficult;

    private String createName;

}
